import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';
import { authenticateUser, requireOrganizationAccess } from './auth-middleware';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure multer for import file uploads
const uploadsDir = path.join(process.cwd(), 'temp', 'imports');
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /json|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === 'application/json' || 
                    file.mimetype === 'application/zip' ||
                    file.mimetype === 'application/x-zip-compressed';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JSON and ZIP files are allowed for data import!'));
    }
  }
});

// Get organization recovery options
router.get('/recovery-options',
  authenticateUser,
  requireOrganizationAccess(['manage_organization']),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);

      // Get organization details
      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get recent export jobs
      const { data: recentExports } = await supabase
        .from('organization_export_jobs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      // Get organization statistics for recovery planning
      const stats = await getRecoveryStats(organizationId);

      res.json({
        organization: org,
        recoveryOptions: {
          fullRestore: {
            available: true,
            description: 'Complete organization data restoration from export file',
            requirements: 'Organization export file (JSON or ZIP format)'
          },
          partialRestore: {
            available: true,
            description: 'Selective data restoration (projects, clients, etc.)',
            requirements: 'JSON export file with specific data sections'
          },
          merge: {
            available: true,
            description: 'Merge imported data with existing organization data',
            requirements: 'Compatible export file, careful review required'
          }
        },
        recentExports: recentExports || [],
        currentStats: stats,
        warnings: [
          'Data recovery will overwrite existing data unless merge mode is selected',
          'All team members should be notified before starting recovery',
          'Create a current export before proceeding with recovery'
        ]
      });
    } catch (error) {
      console.error('Error getting recovery options:', error);
      res.status(500).json({ error: 'Failed to get recovery options' });
    }
  }
);

// Validate import file before actual recovery
router.post('/validate-import',
  authenticateUser,
  requireOrganizationAccess(['manage_organization']),
  upload.single('importFile'),
  async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No import file provided' });
      }

      const validation = await validateImportFile(req.file.path);
      
      // Clean up uploaded file after validation
      await fs.unlink(req.file.path);

      res.json({
        valid: validation.valid,
        fileInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          type: validation.type
        },
        validation
      });
    } catch (error) {
      console.error('Error validating import file:', error);
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      res.status(500).json({ error: 'Failed to validate import file' });
    }
  }
);

// Start organization data recovery
router.post('/start-recovery',
  authenticateUser,
  requireOrganizationAccess(['manage_organization']),
  upload.single('importFile'),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const userId = parseInt(req.userId);
      const { recoveryMode = 'full', confirmDestruction = false } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No import file provided' });
      }

      if (recoveryMode === 'full' && !confirmDestruction) {
        return res.status(400).json({
          error: 'Confirmation required for full recovery',
          hint: 'Full recovery will overwrite all existing data. Set confirmDestruction=true to proceed.'
        });
      }

      // Validate import file
      const validation = await validateImportFile(req.file.path);
      if (!validation.valid) {
        await fs.unlink(req.file.path);
        return res.status(400).json({
          error: 'Invalid import file',
          details: validation.errors
        });
      }

      // Create recovery job
      const recoveryJob = await createRecoveryJob(
        organizationId,
        userId,
        req.file.path,
        recoveryMode,
        validation.data
      );

      // Start recovery process (in a real implementation, this would be queued)
      console.log(`🔄 Starting recovery job ${recoveryJob.id} for organization ${organizationId}`);

      res.json({
        success: true,
        jobId: recoveryJob.id,
        status: 'processing',
        message: 'Recovery process started. This may take several minutes.',
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
    } catch (error) {
      console.error('Error starting recovery:', error);
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      res.status(500).json({ error: 'Failed to start recovery process' });
    }
  }
);

// Get recovery job status
router.get('/recovery-jobs/:jobId',
  authenticateUser,
  requireOrganizationAccess(),
  async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const organizationId = parseInt(req.organizationId);

      const job = await getRecoveryJob(jobId, organizationId);
      
      if (!job) {
        return res.status(404).json({ error: 'Recovery job not found' });
      }

      res.json(job);
    } catch (error) {
      console.error('Error checking recovery job:', error);
      res.status(500).json({ error: 'Failed to check recovery status' });
    }
  }
);

// Create organization backup before recovery
router.post('/create-backup',
  authenticateUser,
  requireOrganizationAccess(['manage_organization']),
  async (req: any, res) => {
    try {
      const organizationId = parseInt(req.organizationId);
      const userId = parseInt(req.userId);

      // Create a full export as backup
      const backupJob = await supabase
        .from('organization_export_jobs')
        .insert({
          organization_id: organizationId,
          requested_by: userId,
          export_options: {
            includeProjects: true,
            includeClients: true,
            includeTeamMembers: true,
            includeDocuments: true,
            includeComments: true,
            includeTasks: true,
            includeActivities: true,
            format: 'archive'
          },
          status: 'scheduled'
        })
        .select()
        .single();

      if (backupJob.error) {
        throw backupJob.error;
      }

      res.json({
        success: true,
        backupJobId: backupJob.data.id,
        message: 'Backup creation started. Use this before any recovery operations.'
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  }
);

// Helper function to validate import file
async function validateImportFile(filePath: string): Promise<any> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    const validation = {
      valid: true,
      type: 'json',
      errors: [] as string[],
      warnings: [] as string[],
      data: null as any,
      stats: {
        projects: 0,
        clients: 0,
        members: 0,
        tasks: 0
      }
    };

    // Check required structure
    if (!data.organization) {
      validation.errors.push('Missing organization data');
      validation.valid = false;
    }

    if (!data.exportedAt) {
      validation.warnings.push('Export timestamp not found');
    }

    // Validate data structure and count items
    if (data.projects && Array.isArray(data.projects)) {
      validation.stats.projects = data.projects.length;
    }

    if (data.clients && Array.isArray(data.clients)) {
      validation.stats.clients = data.clients.length;
    }

    if (data.members && Array.isArray(data.members)) {
      validation.stats.members = data.members.length;
    }

    // Count total tasks across all projects
    if (data.projects) {
      validation.stats.tasks = data.projects.reduce((total: number, project: any) => {
        return total + (project.tasks ? project.tasks.length : 0);
      }, 0);
    }

    validation.data = data;
    return validation;
  } catch (error) {
    return {
      valid: false,
      type: 'unknown',
      errors: [`File parsing error: ${error.message}`],
      warnings: [],
      data: null,
      stats: { projects: 0, clients: 0, members: 0, tasks: 0 }
    };
  }
}

// Helper function to get recovery statistics
async function getRecoveryStats(organizationId: number): Promise<any> {
  const [
    { count: projectCount },
    { count: clientCount },
    { count: memberCount },
    { count: taskCount }
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('organization_memberships').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('project_tasks').select('*', { count: 'exact', head: true })
  ]);

  return {
    projects: projectCount || 0,
    clients: clientCount || 0,
    members: memberCount || 0,
    tasks: taskCount || 0,
    lastUpdated: new Date().toISOString()
  };
}

// Helper function to create recovery job
async function createRecoveryJob(
  organizationId: number,
  userId: number,
  filePath: string,
  mode: string,
  importData: any
): Promise<any> {
  const { data, error } = await supabase
    .from('organization_recovery_jobs')
    .insert({
      organization_id: organizationId,
      requested_by: userId,
      recovery_mode: mode,
      import_file_path: filePath,
      import_data_preview: {
        stats: importData.stats || {},
        exportedAt: importData.exportedAt,
        organizationName: importData.organization?.name
      },
      status: 'processing',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper function to get recovery job
async function getRecoveryJob(jobId: number, organizationId: number): Promise<any> {
  const { data, error } = await supabase
    .from('organization_recovery_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .single();

  if (error) throw error;
  return data;
}

export default router;