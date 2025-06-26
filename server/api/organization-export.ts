import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';
import { authenticateUser, requireOrganizationAccess } from './auth-middleware';
import archiver from 'archiver';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';

const router = Router();

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExportOptions {
  includeProjects?: boolean;
  includeClients?: boolean;
  includeTeamMembers?: boolean;
  includeDocuments?: boolean;
  includeComments?: boolean;
  includeTasks?: boolean;
  includeActivities?: boolean;
  format?: 'json' | 'csv' | 'archive';
  dateRange?: {
    from?: string;
    to?: string;
  };
}

// Get organization data export
router.post('/export',
  authenticateUser,
  requireOrganizationAccess(['export_data']),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const exportOptions: ExportOptions = req.body;
      
      console.log(`📦 Starting data export for organization ${organizationId}`, exportOptions);

      const exportData = await generateOrganizationExport(organizationId, exportOptions);
      
      if (exportOptions.format === 'archive') {
        // Create downloadable archive
        const archivePath = await createArchiveExport(organizationId, exportData);
        res.download(archivePath, `organization-${organizationId}-export-${Date.now()}.zip`);
      } else {
        // Return JSON data
        res.json({
          exportedAt: new Date().toISOString(),
          organizationId,
          options: exportOptions,
          data: exportData
        });
      }
    } catch (error) {
      console.error('Error exporting organization data:', error);
      res.status(500).json({ error: 'Failed to export organization data' });
    }
  }
);

// Get organization usage statistics for export preview
router.get('/export/preview',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      const stats = await getOrganizationStats(organizationId);
      
      res.json({
        organizationId,
        stats,
        estimatedExportSize: calculateEstimatedSize(stats),
        availableFormats: ['json', 'csv', 'archive']
      });
    } catch (error) {
      console.error('Error getting export preview:', error);
      res.status(500).json({ error: 'Failed to get export preview' });
    }
  }
);

// Schedule organization data export (for large exports)
router.post('/export/schedule',
  authenticateUser,
  requireOrganizationAccess(['export_data']),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const userId = parseInt(req.userId);
      const exportOptions: ExportOptions = req.body;

      // Create export job record
      const exportJob = await createExportJob(organizationId, userId, exportOptions);
      
      // In a real implementation, this would queue the job for background processing
      console.log(`📅 Scheduled export job ${exportJob.id} for organization ${organizationId}`);
      
      res.json({
        success: true,
        jobId: exportJob.id,
        status: 'scheduled',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        message: 'Export job scheduled. You will receive an email when complete.'
      });
    } catch (error) {
      console.error('Error scheduling export:', error);
      res.status(500).json({ error: 'Failed to schedule export' });
    }
  }
);

// Check export job status
router.get('/export/jobs/:jobId',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const organizationId = parseInt(req.organizationId);

      const job = await getExportJob(jobId, organizationId);
      
      if (!job) {
        return res.status(404).json({ error: 'Export job not found' });
      }

      res.json(job);
    } catch (error) {
      console.error('Error checking export job:', error);
      res.status(500).json({ error: 'Failed to check export status' });
    }
  }
);

// Download completed export
router.get('/export/download/:jobId',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const organizationId = parseInt(req.organizationId);

      const job = await getExportJob(jobId, organizationId);
      
      if (!job || job.status !== 'completed') {
        return res.status(404).json({ error: 'Export not found or not completed' });
      }

      if (!job.downloadPath) {
        return res.status(404).json({ error: 'Export file not available' });
      }

      res.download(job.downloadPath, job.filename);
    } catch (error) {
      console.error('Error downloading export:', error);
      res.status(500).json({ error: 'Failed to download export' });
    }
  }
);

// Helper function to generate complete organization export
async function generateOrganizationExport(
  organizationId: number, 
  options: ExportOptions = {}
): Promise<any> {
  const exportData: any = {
    organization: null,
    members: [],
    projects: [],
    clients: [],
    documents: [],
    comments: [],
    tasks: [],
    activities: []
  };

  // Get organization details
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();
  
  exportData.organization = org;

  // Get organization members
  if (options.includeTeamMembers !== false) {
    const { data: members } = await supabase
      .from('organization_memberships')
      .select(`
        *,
        users!inner (*)
      `)
      .eq('organization_id', organizationId);
    
    exportData.members = members || [];
  }

  // Get clients
  if (options.includeClients !== false) {
    exportData.clients = await storage.getClients(organizationId);
  }

  // Get projects with related data
  if (options.includeProjects !== false) {
    const projects = await storage.getProjects(organizationId);
    
    for (const project of projects) {
      const projectData: any = { ...project };
      
      // Add team members
      projectData.teamMembers = await storage.getProjectTeamMembers(project.id);
      
      // Add milestones
      projectData.milestones = await storage.getMilestonesByProject(project.id);
      
      if (options.includeTasks !== false) {
        projectData.tasks = await storage.getProjectTasks(project.id);
      }
      
      if (options.includeComments !== false) {
        projectData.comments = await storage.getProjectComments(project.id);
      }
      
      if (options.includeDocuments !== false) {
        projectData.documents = await storage.getDocumentsByProject(project.id);
      }
      
      exportData.projects.push(projectData);
    }
  }

  // Get organization-wide activities
  if (options.includeActivities !== false) {
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .or(`client_id.in.(${exportData.clients.map((c: any) => c.id).join(',')}),project_id.in.(${exportData.projects.map((p: any) => p.id).join(',')})`)
      .order('created_at', { ascending: false })
      .limit(1000);
    
    exportData.activities = activities || [];
  }

  return exportData;
}

// Helper function to get organization statistics
async function getOrganizationStats(organizationId: number): Promise<any> {
  const [
    { data: projects, count: projectCount },
    { data: clients, count: clientCount },
    { data: members, count: memberCount },
    { data: tasks, count: taskCount }
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact' }).eq('organization_id', organizationId),
    supabase.from('clients').select('*', { count: 'exact' }).eq('organization_id', organizationId),
    supabase.from('organization_memberships').select('*', { count: 'exact' }).eq('organization_id', organizationId),
    supabase.from('project_tasks').select('*', { count: 'exact' }).in('project_id', 
      projects?.map(p => p.id) || []
    )
  ]);

  return {
    projects: projectCount || 0,
    clients: clientCount || 0,
    members: memberCount || 0,
    tasks: taskCount || 0,
    lastUpdated: new Date().toISOString()
  };
}

// Helper function to calculate estimated export size
function calculateEstimatedSize(stats: any): string {
  // Rough estimation based on data counts
  const baseSize = 1000; // 1KB base
  const projectSize = stats.projects * 5000; // ~5KB per project
  const clientSize = stats.clients * 1000; // ~1KB per client
  const memberSize = stats.members * 2000; // ~2KB per member
  const taskSize = stats.tasks * 1000; // ~1KB per task
  
  const totalBytes = baseSize + projectSize + clientSize + memberSize + taskSize;
  
  if (totalBytes < 1024 * 1024) {
    return `${Math.round(totalBytes / 1024)}KB`;
  } else {
    return `${Math.round(totalBytes / (1024 * 1024))}MB`;
  }
}

// Helper function to create archive export
async function createArchiveExport(organizationId: number, exportData: any): Promise<string> {
  const exportDir = path.join(process.cwd(), 'temp', 'exports');
  await fs.mkdir(exportDir, { recursive: true });
  
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
  const archivePath = path.join(exportDir, `org-${organizationId}-${timestamp}.zip`);
  
  const output = createWriteStream(archivePath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.pipe(output);
  
  // Add main data file
  archive.append(JSON.stringify(exportData, null, 2), { name: 'organization-data.json' });
  
  // Add CSV files for each data type
  if (exportData.projects?.length > 0) {
    const projectsCsv = convertToCSV(exportData.projects);
    archive.append(projectsCsv, { name: 'projects.csv' });
  }
  
  if (exportData.clients?.length > 0) {
    const clientsCsv = convertToCSV(exportData.clients);
    archive.append(clientsCsv, { name: 'clients.csv' });
  }
  
  if (exportData.members?.length > 0) {
    const membersCsv = convertToCSV(exportData.members);
    archive.append(membersCsv, { name: 'team-members.csv' });
  }
  
  // Add README
  const readme = `
# Organization Data Export
Exported: ${new Date().toISOString()}
Organization ID: ${organizationId}

## Files Included:
- organization-data.json: Complete data export in JSON format
- projects.csv: Projects data in CSV format
- clients.csv: Clients data in CSV format  
- team-members.csv: Team members data in CSV format

## Data Recovery:
This export can be used to restore your organization data if needed.
Contact support for assistance with data restoration.
  `;
  
  archive.append(readme.trim(), { name: 'README.txt' });
  
  await archive.finalize();
  
  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(archivePath));
    output.on('error', reject);
  });
}

// Helper function to convert data to CSV
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  
  return csvContent.join('\n');
}

// Helper function to create export job record
async function createExportJob(
  organizationId: number, 
  userId: number, 
  options: ExportOptions
): Promise<any> {
  const { data, error } = await supabase
    .from('organization_export_jobs')
    .insert({
      organization_id: organizationId,
      requested_by: userId,
      export_options: options,
      status: 'scheduled',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Helper function to get export job
async function getExportJob(jobId: number, organizationId: number): Promise<any> {
  const { data, error } = await supabase
    .from('organization_export_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .single();
  
  if (error) throw error;
  return data;
}

export default router;