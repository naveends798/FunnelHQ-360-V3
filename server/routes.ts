import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { storage } from "./storage";
import { insertUserSchema, insertClientSchema, insertProjectSchema, insertMilestoneSchema, insertActivitySchema, insertNotificationSchema, insertUserInvitationSchema, insertUserCollaborationSchema, insertOnboardingFormSchema, insertFormSubmissionSchema, insertProjectCommentSchema, insertAssetSchema, insertProjectTaskSchema, insertSupportTicketSchema, insertSupportTicketMessageSchema, insertMessageSchema, insertDirectMessageSchema, insertTeamDirectMessageSchema, insertProjectTeamMemberSchema, insertInvitationAuditSchema, insertRoleAssignmentSchema } from "@shared/schema";
import { z } from "zod";
import { BillingService } from "./billing";
import { handleClerkWebhook } from "./api/clerk-webhooks";
// import { testWebhookEndpoint, simulateClerkWebhook } from "./api/test-webhook";
import { createOrUpdateUser, getUserByEmail, updateUser, deleteUser, hardDeleteUser, hardDeleteUserByClerkId, getUserUsage, expireTrialUsers } from "./api/supabase-users";
import { createOrUpdateOrganization, createOrganizationMembership, createOrganizationInvitation, getOrganizationByClerkId, updateInvitationStatus } from "./api/supabase-organizations";
import { sendClientProjectAssignmentEmail, sendTeamProjectAssignmentEmail, sendTestEmail } from "./api/email-service";
import invitationRoutes from "./api/invitations";
import { authenticateUser, requireAdmin, requireTeamAccess } from "./api/auth-middleware";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export async function registerRoutes(app: Express): Promise<Server> {
  let serverInstance: any = null;
  
  // Configure multer for avatar uploads
  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const upload = multer({
    storage: storage_config,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });

  // Avatar upload endpoint
  app.post("/api/users/:userId/avatar", upload.single('avatar'), async (req, res) => {
    console.log('Avatar upload request received for user:', req.params.userId);
    console.log('File in request:', req.file ? 'YES' : 'NO');
    if (req.file) {
      console.log('File details:', req.file.originalname, req.file.mimetype, req.file.size);
    }
    
    try {
      const userId = parseInt(req.params.userId);
      
      if (!req.file) {
        console.log('No file in request body');
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Generate avatar URL
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      
      // Update user's avatar in database
      const updatedUser = await storage.updateUser(userId, { avatar: avatarUrl });
      
      if (!updatedUser) {
        // Clean up uploaded file if user update fails
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        success: true,
        avatarUrl: avatarUrl,
        user: updatedUser
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      // Clean up uploaded file on error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health check endpoint - CRITICAL for production
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const dbTest = await storage.testConnection();
      
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        database: dbTest ? "connected" : "disconnected",
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        features: {
          clerk: !!process.env.CLERK_SECRET_KEY,
          supabase: !!process.env.VITE_SUPABASE_URL,
          webhooks: !!process.env.CLERK_WEBHOOK_SECRET
        }
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Clerk Webhook endpoints
  app.post("/api/clerk/webhook", handleClerkWebhook);
  
  // Test webhook endpoints (development only)
  if (process.env.NODE_ENV !== 'production') {
    // app.post("/api/test/webhook", testWebhookEndpoint);
    // app.post("/api/test/clerk-webhook", simulateClerkWebhook);
  }

  // Supabase User Management endpoints
  app.post("/api/supabase/users", createOrUpdateUser);
  app.get("/api/supabase/users/:email", getUserByEmail);
  app.put("/api/supabase/users/:email", updateUser);
  app.delete("/api/supabase/users/:email", deleteUser);
  app.delete("/api/supabase/users/:email/hard-delete", hardDeleteUser);
  app.delete("/api/supabase/users/by-clerk-id/:clerkId/hard-delete", hardDeleteUserByClerkId);
  app.get("/api/supabase/users/:email/usage", getUserUsage);
  app.post("/api/supabase/users/expire-trials", expireTrialUsers);

  // Supabase Organization Management endpoints
  app.post("/api/supabase/organizations", createOrUpdateOrganization);
  app.get("/api/supabase/organizations/:clerkOrgId", getOrganizationByClerkId);
  app.post("/api/supabase/organizations/memberships", createOrganizationMembership);
  app.post("/api/supabase/organizations/invitations", createOrganizationInvitation);
  app.put("/api/supabase/organizations/invitations/:invitationId", updateInvitationStatus);

  // Email notification endpoints
  app.post("/api/email/client-project-assignment", sendClientProjectAssignmentEmail);
  app.post("/api/email/team-project-assignment", sendTeamProjectAssignmentEmail);
  app.post("/api/email/test", sendTestEmail);

  // Use the new invitation routes
  app.use("/api/invitations", invitationRoutes);

  // Enhanced Invitation System endpoints
  app.post("/api/invitations/validate", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const invitation = await storage.validateInvitationToken(token);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }

      res.json(invitation);
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ error: "Failed to validate invitation" });
    }
  });

  app.post("/api/invitations/send", async (req, res) => {
    try {
      const invitationData = insertUserInvitationSchema.parse(req.body);
      const invitation = await storage.createUserInvitation(invitationData);
      res.json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ 
        error: "Failed to create invitation",
        details: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.post("/api/invitations/accept", async (req, res) => {
    try {
      const { token, userId } = req.body;
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const invitation = await storage.acceptInvitation(token, userId, metadata);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }

      res.json(invitation);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  app.delete("/api/invitations/:id", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const { revokedBy, reason } = req.body;

      const success = await storage.revokeInvitation(invitationId, revokedBy, reason);
      if (!success) {
        return res.status(404).json({ error: "Invitation not found or already processed" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking invitation:", error);
      res.status(500).json({ error: "Failed to revoke invitation" });
    }
  });

  app.get("/api/invitations/email/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const invitations = await storage.getInvitationsByEmail(email);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.get("/api/invitations/:id", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const invitation = await storage.getInvitationById(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      res.json(invitation);
    } catch (error) {
      console.error("Error fetching invitation:", error);
      res.status(500).json({ error: "Failed to fetch invitation" });
    }
  });

  app.get("/api/users/:userId/role-assignments", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assignments = await storage.getRoleAssignmentHistory(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching role assignments:", error);
      res.status(500).json({ error: "Failed to fetch role assignments" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Users endpoint
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get single user
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Create new user
  app.post("/api/users", async (req, res) => {
    try {
      const { role, organizationId, ...userData } = req.body;
      
      // Check team member limits if adding to an organization
      if (organizationId) {
        const organizationWithUsage = await storage.getOrganizationWithUsage(organizationId);
        if (!organizationWithUsage) {
          return res.status(404).json({ error: "Organization not found" });
        }
        
        const currentUsage = {
          projects: organizationWithUsage.projects?.length || 0,
          teamMembers: organizationWithUsage.users?.length || 0,
          storage: 0 // Storage usage not implemented yet
        };
        
        const limitCheck = BillingService.checkLimits(organizationWithUsage.subscriptionPlan, currentUsage);
        if (!limitCheck.withinLimits && limitCheck.exceeded.includes('teamMembers')) {
          return res.status(403).json({ 
            error: "Team member limit exceeded", 
            message: `Your ${organizationWithUsage.subscriptionPlan} plan allows ${organizationWithUsage.subscriptionPlan === 'solo' ? '1 team member' : 'unlimited team members'}. Upgrade to Pro for unlimited team members.`
          });
        }
      }
      
      // Validate user data (excluding role which is handled separately)
      const validatedUserData = insertUserSchema.parse(userData);
      const user = await storage.createUser(validatedUserData);
      
      // Also create user role entry if organizationId and role are provided
      if (organizationId && role) {
        await storage.updateUserRole(user.id, organizationId, role);
      }
      
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      console.error("Failed to create user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user details
  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Complete profile endpoint
  app.post("/api/users/complete-profile", async (req, res) => {
    try {
      const { clerkId, email, name, companyName, companyRole, industry, companySize, specialization } = req.body;
      
      console.log("Complete profile request body:", req.body);
      
      if (!email) {
        console.error("Missing email in request body");
        return res.status(400).json({ error: "Email is required" });
      }

      if (!name) {
        console.error("Missing name in request body");
        return res.status(400).json({ error: "Name is required" });
      }

      // Validate required profile fields
      if (!companyName || !companyRole || !industry || !companySize || !specialization) {
        console.error("Missing required profile fields:", { companyName, companyRole, industry, companySize, specialization });
        return res.status(400).json({ 
          error: "All profile fields are required", 
          missing: {
            companyName: !companyName,
            companyRole: !companyRole,
            industry: !industry,
            companySize: !companySize,
            specialization: !specialization
          }
        });
      }

      // Try to find existing user by email
      const users = await storage.getUsers();
      let user = users.find(u => u.email === email);

      if (user) {
        // Update existing user
        const updatedUser = await storage.updateUser(user.id, {
          clerkUserId: clerkId,
          name: name || user.name,
          companyName,
          companyRole,
          industry,
          companySize,
          specialization
        });
        console.log("Updated existing user:", updatedUser?.id);
        res.json(updatedUser);
      } else {
        // Create new user
        const newUser = await storage.createUser({
          clerkUserId: clerkId,
          email,
          name: name || email.split('@')[0],
          companyName,
          companyRole,
          industry,
          companySize,
          specialization
        });
        console.log("Created new user:", newUser.id);
        res.status(201).json(newUser);
      }
    } catch (error) {
      console.error("Failed to complete profile:", error);
      res.status(500).json({ error: "Failed to complete profile", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Input validation middleware
  const validateUserId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.query.userId as string;
    if (userId && !/^\d+$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }
    next();
  };

  // Projects endpoints
  app.get("/api/projects", validateUserId, async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : 1;
      
      if (userId) {
        // Check if user is admin (user ID 1 for testing)
        if (userId === 1) {
          // Admin users see all projects
          const projects = await storage.getProjects();
          const projectsWithClients = await Promise.all(
            projects.map(async (project) => {
              const client = project.client_id ? await storage.getClient(project.client_id) : null;
              return { ...project, client };
            })
          );
          res.json(projectsWithClients);
        } else {
          // Return projects filtered by user access
          const projects = await storage.getProjectsForUser(userId, organizationId);
          res.json(projects);
        }
      } else {
        // Return all projects (fallback admin view)
        const projects = await storage.getProjects();
        const projectsWithClients = await Promise.all(
          projects.map(async (project) => {
            const client = project.client_id ? await storage.getClient(project.client_id) : null;
            return { ...project, client };
          })
        );
        res.json(projectsWithClients);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProjectWithClient(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      // Convert date strings to Date objects if present
      if (req.body.endDate && typeof req.body.endDate === 'string') {
        req.body.endDate = new Date(req.body.endDate);
      }
      if (req.body.startDate && typeof req.body.startDate === 'string') {
        req.body.startDate = new Date(req.body.startDate);
      }
      
      const projectData = insertProjectSchema.parse(req.body);
      
      // Check project limits before creating project
      if (projectData.organizationId) {
        const organizationWithUsage = await storage.getOrganizationWithUsage(projectData.organizationId);
        if (!organizationWithUsage) {
          return res.status(404).json({ error: "Organization not found" });
        }
        
        const currentUsage = {
          projects: organizationWithUsage.projects?.length || 0,
          teamMembers: organizationWithUsage.users?.length || 0,
          storage: 0 // Storage usage not implemented yet
        };
        
        const limitCheck = BillingService.checkLimits(organizationWithUsage.subscriptionPlan, currentUsage);
        if (!limitCheck.withinLimits && limitCheck.exceeded.includes('projects')) {
          return res.status(403).json({ 
            error: "Project limit exceeded", 
            message: `Your ${organizationWithUsage.subscriptionPlan} plan allows ${organizationWithUsage.subscriptionPlan === 'solo' ? '3 projects' : 'unlimited projects'}. Upgrade to Pro for unlimited projects.`
          });
        }
      }
      
      const project = await storage.createProject(projectData);
      
      // Send email notification to client if assigned
      if (project.clientId) {
        try {
          // Get client details
          const client = await storage.getClient(project.clientId);
          if (client && client.email) {
            console.log(`📧 Sending project assignment email to client: ${client.email}`);
            
            // Prepare email data
            const emailData = {
              clientEmail: client.email,
              clientName: client.name,
              projectTitle: project.title,
              projectId: project.id,
              companyName: 'FunnelHQ',
              loginUrl: `${process.env.CLIENT_URL || 'http://localhost:3002'}/client-portal`
            };

            // Send email notification
            const emailResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3002'}/api/email/client-project-assignment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(emailData),
            });

            if (emailResponse.ok) {
              const emailResult = await emailResponse.json();
              console.log(`✅ Email sent successfully to ${client.email}, messageId: ${emailResult.messageId}`);
            } else {
              console.error(`❌ Failed to send email to ${client.email}:`, await emailResponse.text());
            }
          }
        } catch (emailError) {
          console.error('Error sending client notification email:', emailError);
          // Don't fail project creation if email fails
        }
      }
      
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, updateData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get current project and its tasks for auto-calculation
      const currentProject = await storage.getProject(id);
      if (!currentProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      let updateData = { ...req.body };

      // Handle auto-calculations if enabled
      if (req.body.progress === null || req.body.progress === undefined) {
        // Auto-calculate progress from tasks
        const tasks = await storage.getProjectTasks(id);
        if (tasks && tasks.length > 0) {
          const completedTasks = tasks.filter((task: any) => task.status === "done");
          updateData.progress = Math.round((completedTasks.length / tasks.length) * 100);
        }
      }

      if (req.body.endDate === null || req.body.endDate === undefined) {
        // Auto-calculate end date from task due dates
        const tasks = await storage.getProjectTasks(id);
        if (tasks && tasks.length > 0) {
          const dueDates = tasks
            .map((task: any) => task.dueDate)
            .filter((date: any) => date !== null && date !== undefined)
            .map((date: any) => new Date(date))
            .filter((date: Date) => !isNaN(date.getTime()));
          
          if (dueDates.length > 0) {
            updateData.endDate = new Date(Math.max(...dueDates.map((date: any) => date.getTime())));
          }
        }
      }

      // Convert date strings to Date objects if present
      if (updateData.endDate && typeof updateData.endDate === 'string') {
        updateData.endDate = new Date(updateData.endDate);
      }
      if (updateData.startDate && typeof updateData.startDate === 'string') {
        updateData.startDate = new Date(updateData.startDate);
      }

      const validatedData = insertProjectSchema.partial().parse(updateData);
      const project = await storage.updateProject(id, validatedData);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Project Tasks endpoints
  app.get("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tasks = await storage.getProjectTasks(projectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project tasks" });
    }
  });

  app.get("/api/projects/:projectId/tasks/status/:status", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const status = req.params.status;
      const tasks = await storage.getTasksByStatus(projectId, status);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks by status" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getProjectTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const taskData = { ...req.body, projectId };
      const validatedTask = insertProjectTaskSchema.parse(taskData);
      const task = await storage.createProjectTask(validatedTask);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.updateProjectTask(id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.patch("/api/tasks/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      // Get the task to find its project ID
      const currentTask = await storage.getProjectTask(id);
      if (!currentTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const task = await storage.updateTaskStatus(id, status);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Auto-update project progress and end date based on tasks
      const projectId = currentTask.projectId;
      const allTasks = await storage.getProjectTasks(projectId);
      
      if (allTasks && allTasks.length > 0) {
        // Calculate new progress
        const completedTasks = allTasks.filter((t: any) => t.id === id ? status === "done" : t.status === "done");
        const newProgress = Math.round((completedTasks.length / allTasks.length) * 100);
        
        // Calculate new end date from latest task due date
        const dueDates = allTasks
          .map((t: any) => t.dueDate)
          .filter((date: any) => date !== null && date !== undefined)
          .map((date: any) => new Date(date))
          .filter((date: Date) => !isNaN(date.getTime()));
        
        let newEndDate = null;
        if (dueDates.length > 0) {
          newEndDate = new Date(Math.max(...dueDates.map((date: any) => date.getTime())));
        }

        // Update project with calculated values
        await storage.updateProject(projectId, {
          progress: newProgress,
          endDate: newEndDate
        });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task status" });
    }
  });

  app.patch("/api/tasks/:id/position", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { position } = req.body;
      if (position === undefined) {
        return res.status(400).json({ error: "Position is required" });
      }
      const task = await storage.updateTaskPosition(id, position);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task position" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProjectTask(id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Task assignment notification endpoint
  app.post("/api/tasks/:id/assign", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { assignedTo, assignedBy } = req.body;
      
      // Get task details
      const task = await storage.getProjectTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Update task assignment
      await storage.updateProjectTask(taskId, { assignedTo });
      
      // Get assignee and assigner details
      const assignee = await storage.getUser(assignedTo);
      const assigner = await storage.getUser(assignedBy);
      const project = await storage.getProject(task.projectId);
      
      if (assignee && assigner && project) {
        // Create notification for the assigned user
        const notificationData = {
          userId: assignee.id,
          organizationId: project.organizationId || 1,
          type: "task_assignment",
          title: "New Task Assigned",
          message: `${assigner.name} assigned you a new task: "${task.title}"`,
          data: [task.id, task.title, task.projectId, project.title, assigner.name, task.priority, task.dueDate] as [any, ...any[]],
          actionUrl: `/tasks/${task.id}`
        };
        
        const notification = await storage.createNotification(notificationData);
        
        // Broadcast the notification via WebSocket
        if (serverInstance && serverInstance.broadcastNotification) {
          serverInstance.broadcastNotification(assignee.id, notification);
        }
        
        res.json({ 
          success: true, 
          message: "Task assigned and notification sent",
          notification 
        });
      } else {
        res.json({ 
          success: true, 
          message: "Task assigned but notification could not be sent" 
        });
      }
    } catch (error) {
      console.error("Task assignment error:", error);
      res.status(500).json({ error: "Failed to assign task" });
    }
  });

  // Project Team Member endpoints
  app.get("/api/projects/:projectId/team-members", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const teamMembers = await storage.getProjectTeamMembers(projectId);
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project team members" });
    }
  });

  app.post("/api/projects/:projectId/team-members", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const memberData = {
        ...req.body,
        projectId
      };
      
      const validatedData = insertProjectTeamMemberSchema.parse(memberData);
      const member = await storage.addProjectTeamMember(validatedData);
      
      // Get project and user details for notification
      const project = await storage.getProject(projectId);
      const user = await storage.getUser(memberData.userId);
      const assigner = await storage.getUser(memberData.assignedBy);
      
      if (project && user) {
        // Create notification for the assigned team member
        const notificationData = {
          userId: user.id,
          organizationId: project.organizationId,
          type: "project_assignment",
          title: "Assigned to New Project",
          message: `You have been assigned to the project "${project.title}" as ${memberData.role.replace('_', ' ')}`,
          data: [project.id, project.title, memberData.role, assigner?.name || 'Admin'] as [any, ...any[]],
          isRead: false,
          actionUrl: `/projects/${project.id}`
        };
        
        const notification = await storage.createNotification(notificationData);
        
        // Broadcast the notification via WebSocket
        if (serverInstance && serverInstance.broadcastNotification) {
          serverInstance.broadcastNotification(notification.userId, notification);
        }
      }
      
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid team member data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add team member to project" });
    }
  });

  app.patch("/api/project-team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const member = await storage.updateProjectTeamMember(id, updateData);
      if (!member) {
        return res.status(404).json({ error: "Team member assignment not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team member assignment" });
    }
  });

  app.delete("/api/project-team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.removeProjectTeamMember(id);
      if (!success) {
        return res.status(404).json({ error: "Team member assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove team member from project" });
    }
  });

  app.get("/api/projects/:projectId/user/:userId/role", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);
      
      const role = await storage.getUserProjectRole(projectId, userId);
      if (!role) {
        return res.status(404).json({ error: "User not assigned to project" });
      }
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user project role" });
    }
  });

  // Old middleware removed - now using proper Clerk authentication from auth-middleware.ts

  // Clients endpoints - Direct Supabase access (no authentication required)
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      console.log('API returning clients:', JSON.stringify(clients, null, 2));
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClientWithProjects(id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  // Client avatar upload endpoint
  app.post("/api/clients/:id/avatar", upload.single('avatar'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Generate avatar URL
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      
      // Update client's avatar in database
      const updatedClient = await storage.updateClient(id, { avatar: avatarUrl });
      
      if (!updatedClient) {
        // Clean up uploaded file if client update fails
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Client not found" });
      }

      res.json({ 
        success: true, 
        avatarUrl,
        client: updatedClient 
      });
    } catch (error) {
      console.error("❌ Error uploading client avatar:", error);
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("❌ Error cleaning up file:", unlinkError);
        }
      }
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // EMERGENCY: Special endpoint to force delete problematic client 13
  app.delete("/api/clients/force/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`🚨 FORCE DELETE requested for client ${id}`);
      
      if (id !== 13) {
        return res.status(403).json({ error: "Force delete only allowed for client 13" });
      }
      
      // Direct database operations to bypass triggers
      // We'll use the storage methods but catch and ignore audit errors
      
      // Step 1: Use raw storage to try deletion with error handling
      console.log('Step 1: Attempting to delete via storage...');
      try {
        await storage.deleteClient(13);
        console.log('✅ Normal deletion worked!');
      } catch (deleteError) {
        console.log('Normal deletion failed, trying manual approach...');
        
        // Manual cleanup approach - delete items individually
        console.log('Manual cleanup: deleting all audit records...');
        
        // This is a workaround - we'll create a simple project delete
        console.log('Force deleting the problematic project and client...');
        // Actually try the manual fix
        console.log('Attempting manual database fix...');
        
        // Access supabase directly through storage instance
        const supabaseClient = (storage as any).supabase;
        
        // Delete audit records first
        console.log('Deleting audit records...');
        await supabaseClient.from('activity_audit').delete().eq('resource_id', 1);
        
        // Update project organization_id
        console.log('Updating project organization_id...');
        await supabaseClient.from('projects').update({ organization_id: 1 }).eq('id', 1);
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Now try normal deletion again
        console.log('Retrying normal deletion...');
        await storage.deleteClient(13);
      }
      
      console.log('✅ Force deletion completed successfully');
      res.json({ success: true, message: "Client force deleted successfully" });
    } catch (error) {
      console.error(`❌ Force delete failed:`, error);
      res.status(500).json({ error: "Force delete failed", details: error.message });
    }
  });

  // Get client by email (for webhook role determination)
  app.get("/api/supabase/clients/by-email/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      const client = await storage.getClientByEmail(email);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json({ client });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client by email" });
    }
  });

  app.post("/api/clients", async (req: any, res) => {
    try {
      // Direct Supabase save - extract user info from request body
      const { clerkUserId, userEmail, ...clientFormData } = req.body;
      
      console.log('📝 Creating client with data:', { clerkUserId, userEmail, clientFormData });
      
      const clientData = insertClientSchema.parse({
        ...clientFormData,
        createdBy: 8, // Use existing user ID from Supabase
        organizationId: 1, // Default organization
      });
      
      console.log("Creating client with data:", JSON.stringify(clientData, null, 2));
      
      // Save to Supabase (storage layer now uses Supabase directly)
      const client = await storage.createClient(clientData);
      
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Client validation error:", error.errors);
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      console.error("❌ Error creating client:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ error: "Failed to create client", details: error.message });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedClient = await storage.updateClient(id, req.body);
      if (!updatedClient) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(updatedClient);
    } catch (error) {
      console.error("❌ Error updating client:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`🗑️  Attempting to delete client ${id}`);
      const success = await storage.deleteClient(id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      console.log(`✅ Successfully deleted client ${id}`);
      res.status(204).send();
    } catch (error) {
      console.error(`❌ Error deleting client ${req.params.id}:`, error);
      res.status(500).json({ 
        error: "Failed to delete client", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Activities endpoint
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid activity data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  // Milestones endpoints
  app.get("/api/projects/:id/milestones", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const milestones = await storage.getMilestonesByProject(projectId);
      res.json(milestones);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch milestones" });
    }
  });

  app.post("/api/milestones", async (req, res) => {
    try {
      const milestoneData = insertMilestoneSchema.parse(req.body);
      const milestone = await storage.createMilestone(milestoneData);
      res.status(201).json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid milestone data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create milestone" });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const notifications = await storage.getNotifications({ userId, isRead, limit });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      
      // Broadcast the new notification via WebSocket
      if (serverInstance && serverInstance.broadcastNotification) {
        serverInstance.broadcastNotification(notification.userId, notification);
      }
      
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid notification data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/mark-all-read", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const result = await storage.markAllNotificationsAsRead(userId);
      res.json({ count: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteNotification(id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // Debug endpoint to check user roles
  app.get("/api/debug/user-roles", async (req, res) => {
    try {
      const userRoles = await storage.getAllUserRoles(1); // TODO: get organizationId from auth context
      res.json(userRoles);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user roles" });
    }
  });

  // Team Management endpoints
  app.get("/api/team/members", async (req, res) => {
    try {
      const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : 1;
      const members = await storage.getTeamMembers(organizationId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.get("/api/team/invitations", async (req, res) => {
    try {
      const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : 1;
      const invitations = await storage.getTeamInvitations(organizationId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team invitations" });
    }
  });

  app.post("/api/team/add-member", upload.single('avatar'), async (req, res) => {
    try {
      const { organizationId, email, name, role, specialization } = req.body;
      
      // For now, skip limit checking and just create the user
      // TODO: Implement proper limit checking when getOrganizationWithUsage is available
      
      // Handle avatar upload
      let avatarUrl = null;
      if (req.file) {
        avatarUrl = `/uploads/avatars/${req.file.filename}`;
        console.log('🔍 Avatar uploaded:', avatarUrl);
      }
      
      // Always allow adding team members - multi-tenancy support
      // Check if user exists globally - if so, just add them to this organization
      let user;
      try {
        const allUsers = await storage.getUsers();
        const existingUser = allUsers.find(user => user.email === email);
        
        if (existingUser) {
          // User exists globally, update their data if avatar or name was provided
          console.log('🔍 Adding existing user to organization:', { userId: existingUser.id, organizationId: parseInt(organizationId), role });
          
          // Update existing user data if new info provided
          if (avatarUrl || (name && name !== existingUser.name) || (specialization && specialization !== existingUser.specialization)) {
            const updatedData = {
              ...(avatarUrl && { avatar: avatarUrl }),
              ...(name && name !== existingUser.name && { name }),
              ...(specialization && specialization !== existingUser.specialization && { specialization })
            };
            console.log('🔍 Updating existing user with new data:', updatedData);
            user = await storage.updateUser(existingUser.id, updatedData);
            if (!user) user = existingUser; // Fallback if update returns undefined
          } else {
            user = existingUser;
          }
        } else {
          // Create new user - if this fails due to duplicate email, try to find the user again
          const userData = {
            name: name || email.split('@')[0],
            email,
            specialization: specialization || 'developer',
            avatar: avatarUrl,
            // Team members should not have their own subscription plans
            // They access resources through the organization they're invited to
            subscription_plan: 'none', // Explicitly set to 'none' instead of default 'solo'
            subscription_status: 'none', // No personal subscription status
            max_projects: 0, // Team members don't get personal project limits
            stripe_customer_id: null,
            stripe_subscription_id: null
          };
          
          console.log('🔍 Creating new user with data:', userData);
          try {
            user = await storage.createUser(userData);
            console.log('✅ Created new user:', user);
          } catch (createError: any) {
            // If user creation fails due to duplicate email, try to find the existing user
            console.log('🔍 User creation failed, likely due to duplicate email. Searching for existing user...');
            console.log('Create error:', createError.message);
            
            if (createError.message && createError.message.includes('duplicate') || createError.code === '23505') {
              // Refresh users list and try to find the existing user
              const refreshedUsers = await storage.getUsers();
              const foundUser = refreshedUsers.find(u => u.email === email);
              
              if (foundUser) {
                console.log('✅ Found existing user after creation failure:', foundUser);
                user = foundUser;
                
                // Update with new data if provided
                if (avatarUrl || (name && name !== foundUser.name) || (specialization && specialization !== foundUser.specialization)) {
                  const updatedData = {
                    ...(avatarUrl && { avatar: avatarUrl }),
                    ...(name && name !== foundUser.name && { name }),
                    ...(specialization && specialization !== foundUser.specialization && { specialization })
                  };
                  console.log('🔍 Updating found user with new data:', updatedData);
                  const updatedUser = await storage.updateUser(foundUser.id, updatedData);
                  if (updatedUser) user = updatedUser;
                }
              } else {
                throw createError; // Re-throw if we can't find the user
              }
            } else {
              throw createError; // Re-throw if it's not a duplicate error
            }
          }
        }
      } catch (searchError) {
        console.error('❌ Error in user lookup/creation process:', searchError);
        throw new Error(`Failed to process user: ${searchError instanceof Error ? searchError.message : String(searchError)}`);
      }
      
      // Check if user is already in this organization
      const existingMembers = await storage.getTeamMembers(parseInt(organizationId));
      const isAlreadyMember = existingMembers.some(member => member.id === user.id);
      
      if (isAlreadyMember) {
        console.log('🔍 User is already a member of this organization, updating role...');
        // Update their role instead of creating new
        const userRole = await storage.updateUserRole(user.id, parseInt(organizationId), role);
        console.log('🔍 Updated user role:', userRole);
      } else {
        // Add user role entry for this organization
        console.log('🔍 Adding user role:', { userId: user.id, organizationId: parseInt(organizationId), role });
        const userRole = await storage.updateUserRole(user.id, parseInt(organizationId), role);
        console.log('🔍 Created user role:', userRole);
        
        // Note: updateUserRole might return undefined for new roles in some implementations
        // This is acceptable as long as no error was thrown
      }
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Failed to add team member:", error);
      
      // Clean up uploaded file if user creation fails
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      
      res.status(500).json({ 
        error: "Failed to add team member", 
        details: error instanceof Error ? error.message : JSON.stringify(error, null, 2),
        errorType: typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        rawError: error
      });
    }
  });

  app.post("/api/team/invite", async (req, res) => {
    try {
      // Convert expiresAt string to Date object if present
      if (req.body.expiresAt && typeof req.body.expiresAt === 'string') {
        req.body.expiresAt = new Date(req.body.expiresAt);
      }
      
      const invitationData = insertUserInvitationSchema.parse(req.body);
      
      // Check team member limits before creating invitation
      const organizationId = (invitationData as any).organizationId || 1;
      const organizationWithUsage = await storage.getOrganizationWithUsage(organizationId);
      if (!organizationWithUsage) {
        return res.status(404).json({ error: "Organization not found" });
      }
      
      const currentUsage = {
        projects: organizationWithUsage.projects?.length || 0,
        teamMembers: organizationWithUsage.users?.length || 0,
        storage: 0 // Storage usage not implemented yet
      };
      
      const limitCheck = BillingService.checkLimits(organizationWithUsage.subscriptionPlan, currentUsage);
      if (!limitCheck.withinLimits && limitCheck.exceeded.includes('teamMembers')) {
        return res.status(403).json({ 
          error: "Team member limit exceeded", 
          message: `Your ${organizationWithUsage.subscriptionPlan} plan allows ${organizationWithUsage.subscriptionPlan === 'solo' ? '1 team member' : 'unlimited team members'}. Upgrade to Pro for unlimited team members.`
        });
      }
      
      const invitation = await storage.createTeamInvitation({
        ...invitationData,
        organizationId
      });
      res.status(201).json(invitation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invitation data", details: error.errors });
      }
      res.status(500).json({ 
        error: "Failed to create invitation",
        details: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.patch("/api/team/invitations/:id/resend", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invitation = await storage.resendTeamInvitation(id);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      res.json(invitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to resend invitation" });
    }
  });

  app.delete("/api/team/invitations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.cancelTeamInvitation(id);
      if (!success) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel invitation" });
    }
  });

  app.patch("/api/team/members/:id/role", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role, organizationId } = req.body;
      
      if (!role || !organizationId) {
        return res.status(400).json({ error: "Role and organizationId are required" });
      }
      
      const updatedRole = await storage.updateUserRole(userId, organizationId, role);
      if (!updatedRole) {
        return res.status(404).json({ error: "User role not found" });
      }
      res.json(updatedRole);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  app.patch("/api/team/members/:id/suspend", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { suspend = true } = req.body;
      
      const success = await storage.suspendUser(userId, suspend);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ suspended: suspend });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  app.delete("/api/team/members/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { organizationId } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID is required" });
      }
      
      // Remove user from organization (not delete the user entirely, just remove from org)
      const success = await storage.removeUserFromOrganization(userId, parseInt(organizationId as string));
      if (!success) {
        return res.status(404).json({ error: "User not found in organization" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Failed to remove team member:", error);
      res.status(500).json({ 
        error: "Failed to remove team member",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Onboarding Forms endpoints
  app.get("/api/onboarding-forms", async (req, res) => {
    try {
      const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : 1;
      const forms = await storage.getOnboardingForms(organizationId);
      res.json(forms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding forms" });
    }
  });

  // Get onboarding forms by organization ID (path parameter)
  app.get("/api/onboarding-forms/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const forms = await storage.getOnboardingForms(organizationId);
      res.json(forms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding forms" });
    }
  });

  app.get("/api/onboarding-forms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const form = await storage.getOnboardingForm(id);
      if (!form) {
        return res.status(404).json({ error: "Onboarding form not found" });
      }
      res.json(form);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding form" });
    }
  });

  app.get("/api/onboarding-forms/:id/submissions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const formWithSubmissions = await storage.getOnboardingFormWithSubmissions(id);
      if (!formWithSubmissions) {
        return res.status(404).json({ error: "Onboarding form not found" });
      }
      res.json(formWithSubmissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form submissions" });
    }
  });

  app.post("/api/onboarding-forms", async (req, res) => {
    try {
      console.log('Creating onboarding form with data:', req.body);
      const formData = insertOnboardingFormSchema.parse(req.body);
      console.log('Parsed form data:', formData);
      const form = await storage.createOnboardingForm(formData);
      console.log('Created form:', form);
      res.status(201).json(form);
    } catch (error) {
      console.error('Error creating onboarding form:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid form data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create onboarding form" });
    }
  });

  app.put("/api/onboarding-forms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertOnboardingFormSchema.partial().parse(req.body);
      const form = await storage.updateOnboardingForm(id, updateData);
      if (!form) {
        return res.status(404).json({ error: "Onboarding form not found" });
      }
      res.json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid form data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update onboarding form" });
    }
  });

  app.delete("/api/onboarding-forms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteOnboardingForm(id);
      if (!success) {
        return res.status(404).json({ error: "Onboarding form not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete onboarding form" });
    }
  });

  // Get onboarding form for a specific project
  app.get("/api/projects/:projectId/onboarding-form", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const form = await storage.getOnboardingFormByProject(projectId);
      if (!form) {
        return res.status(404).json({ error: "No onboarding form assigned to this project" });
      }
      res.json(form);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project onboarding form" });
    }
  });

  // Get available users for mentions in project comments (role-based filtering)
  app.get("/api/projects/:projectId/available-users", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const currentUserRole = req.query.role as string;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : 1;
      
      // Get project details to find the client
      const project = await storage.getProjectWithClient(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Get project team members
      const teamMembers = await storage.getProjectTeamMembers(projectId);
      
      // Get organization admins
      const admins = await storage.getTeamMembers(organizationId);
      const adminUsers = admins.filter(member => member.role === 'admin');
      
      let availableUsers: any[] = [];
      
      switch (currentUserRole) {
        case 'client':
          // Clients can only tag admins
          availableUsers = adminUsers;
          break;
          
        case 'admin':
          // Admins can tag both clients and team members
          const clientUser = {
            id: project.client.id,
            name: project.client.name,
            avatar: project.client.avatar,
            role: 'client'
          };
          
          const teamMemberUsers = teamMembers
            .filter(tm => tm.user && tm.user.id !== userId) // Exclude current user
            .map(tm => ({
              id: tm.user.id,
              name: tm.user.name,
              avatar: tm.user.avatar,
              role: 'team_member'
            }));
          
          availableUsers = [clientUser, ...teamMemberUsers];
          break;
          
        case 'team_member':
          // Team members can only tag admins
          availableUsers = adminUsers.filter(admin => admin.id !== userId); // Exclude current user
          break;
          
        default:
          availableUsers = [];
      }
      
      // Remove duplicates and current user
      const uniqueUsers = availableUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id) && user.id !== userId
      );
      
      res.json(uniqueUsers);
    } catch (error) {
      console.error('Error fetching available users:', error);
      res.status(500).json({ error: "Failed to fetch available users" });
    }
  });

  // Form Submissions endpoints
  app.get("/api/form-submissions", async (req, res) => {
    try {
      const formId = req.query.formId ? parseInt(req.query.formId as string) : null;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : null;
      const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : null;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      let submissions;
      
      if (projectId && clientId) {
        // Get submissions for specific project and client
        submissions = await storage.getFormSubmissionsByProjectAndClient(projectId, clientId);
      } else if (projectId) {
        // Get all submissions for a project
        submissions = await storage.getFormSubmissionsByProject(projectId);
      } else if (formId) {
        submissions = await storage.getFormSubmissions(formId);
      } else if (organizationId) {
        // Get all submissions for organization
        submissions = await storage.getFormSubmissionsByOrganization(organizationId);
      } else {
        return res.status(400).json({ error: "formId, projectId, or organizationId is required" });
      }
      
      // Filter submissions based on user access (for team members)
      if (userId) {
        const userIdNum = userId;
        const orgIdNum = organizationId || 1;
        
        // Get projects the user has access to
        const userProjects = await storage.getProjectsForUser(userIdNum, orgIdNum);
        const accessibleProjectIds = new Set(userProjects.map(p => p.id));
        
        // Filter submissions to only include those from accessible projects
        submissions = submissions.filter((submission: any) => 
          accessibleProjectIds.has(submission.projectId)
        );
      }
      
      // Enhance submissions with client and form data
      const enhancedSubmissions = await Promise.all(
        submissions.map(async (submission: any) => {
          const client = await storage.getClient(submission.clientId);
          const form = await storage.getOnboardingForm(submission.formId);
          return { ...submission, client, form };
        })
      );
      
      res.json(enhancedSubmissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form submissions" });
    }
  });

  app.get("/api/form-submissions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : 1;
      
      const submission = await storage.getFormSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Form submission not found" });
      }
      
      // Check if user has access to this submission (for team members)
      if (userId) {
        const userProjects = await storage.getProjectsForUser(userId, organizationId);
        const accessibleProjectIds = new Set(userProjects.map(p => p.id));
        
        if (!accessibleProjectIds.has(submission.projectId)) {
          return res.status(403).json({ error: "Access denied: You don't have permission to view this submission" });
        }
      }
      
      // Enhance submission with client and form data
      const client = await storage.getClient(submission.clientId);
      const form = await storage.getOnboardingForm(submission.formId);
      const enhancedSubmission = { ...submission, client, form };
      
      res.json(enhancedSubmission);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form submission" });
    }
  });

  app.post("/api/form-submissions", async (req, res) => {
    try {
      const submissionData = insertFormSubmissionSchema.parse(req.body);
      const submission = await storage.createFormSubmission(submissionData);
      
      // Create notification for new form submission
      const form = await storage.getOnboardingForm(submission.formId);
      if (form) {
        const notificationData = {
          userId: form.createdBy,
          organizationId: form.organizationId,
          type: "form_submission",
          title: "New form submission",
          message: `A client has submitted the "${form.title}" form`,
          data: [form.id, submission.id] as [any, ...any[]],
          isRead: false,
          actionUrl: `/admin/forms/${form.id}/submissions/${submission.id}`
        };
        
        const notification = await storage.createNotification(notificationData);
        
        // Broadcast the notification via WebSocket
        if (serverInstance && serverInstance.broadcastNotification) {
          serverInstance.broadcastNotification(notification.userId, notification);
        }
      }
      
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid submission data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create form submission" });
    }
  });

  app.put("/api/form-submissions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertFormSubmissionSchema.partial().parse(req.body);
      const submission = await storage.updateFormSubmission(id, updateData);
      
      if (!submission) {
        return res.status(404).json({ error: "Form submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid submission data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update form submission" });
    }
  });

  app.patch("/api/form-submissions/:id/review", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reviewedBy } = req.body;
      
      if (!reviewedBy) {
        return res.status(400).json({ error: "reviewedBy is required" });
      }
      
      const submission = await storage.markSubmissionAsReviewed(id, reviewedBy);
      if (!submission) {
        return res.status(404).json({ error: "Form submission not found" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark submission as reviewed" });
    }
  });

  // Project Comments endpoints
  app.get("/api/projects/:projectId/comments", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const comments = await storage.getProjectComments(projectId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project comments" });
    }
  });

  app.get("/api/comments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comment = await storage.getComment(id);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comment" });
    }
  });

  app.get("/api/comments/:parentId/replies", async (req, res) => {
    try {
      const parentId = parseInt(req.params.parentId);
      const replies = await storage.getCommentThread(parentId);
      res.json(replies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comment replies" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertProjectCommentSchema.parse(req.body);
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid comment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.put("/api/comments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertProjectCommentSchema.partial().parse(req.body);
      const comment = await storage.updateComment(id, updateData);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid comment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteComment(id);
      if (!success) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  app.patch("/api/comments/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { resolvedBy } = req.body;
      
      if (!resolvedBy) {
        return res.status(400).json({ error: "resolvedBy is required" });
      }
      
      const comment = await storage.resolveComment(id, resolvedBy);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve comment" });
    }
  });

  // Asset Management Endpoints
  
  // Get assets with filtering
  app.get("/api/assets", async (req, res) => {
    try {
      const { organizationId = "1", projectId, folder, type, tags, userId } = req.query;
      let assets = await storage.getAssets(
        parseInt(organizationId as string), 
        projectId ? parseInt(projectId as string) : undefined,
        folder as string
      );

      // Filter assets based on user access (for team members)
      if (userId) {
        const userIdNum = parseInt(userId as string);
        const orgIdNum = parseInt(organizationId as string);
        
        // Get projects the user has access to
        const userProjects = await storage.getProjectsForUser(userIdNum, orgIdNum);
        const accessibleProjectIds = new Set(userProjects.map(p => p.id));
        
        // Filter assets to only include those from accessible projects
        assets = assets.filter(asset => 
          !asset.projectId || accessibleProjectIds.has(asset.projectId)
        );
      }

      // Additional filtering
      if (type) {
        assets = await storage.getAssetsByType(parseInt(organizationId as string), type as string);
      }
      
      if (tags) {
        const tagArray = (tags as string).split(',');
        assets = await storage.getAssetsByTags(parseInt(organizationId as string), tagArray);
      }

      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  // Get specific asset
  app.get("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  // Create new asset
  app.post("/api/assets", async (req, res) => {
    try {
      const assetData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(assetData);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid asset data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  // Update asset
  app.put("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assetData = insertAssetSchema.partial().parse(req.body);
      const asset = await storage.updateAsset(id, assetData);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid asset data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  // Delete asset
  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAsset(id);
      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Get folders for organization
  app.get("/api/assets/folders/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const folders = await storage.getFolders(organizationId);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  // Get assets by type
  app.get("/api/assets/type/:organizationId/:type", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const type = req.params.type;
      const assets = await storage.getAssetsByType(organizationId, type);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assets by type" });
    }
  });

  // === ORGANIZATION ROUTES ===

  // Get organization with billing information
  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.getOrganizationWithBilling(id);
      
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(organization);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Get project count for organization
  app.get("/api/organizations/:organizationId/projects/count", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const projects = await storage.getProjects();
      const orgProjects = projects.filter(p => p.organizationId === organizationId);
      res.json({ count: orgProjects.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project count" });
    }
  });

  // === BILLING & SUBSCRIPTION ROUTES ===

  // Get organization billing information
  app.get("/api/billing/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const orgWithBilling = await storage.getOrganizationWithBilling(organizationId);
      
      if (!orgWithBilling) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(orgWithBilling);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch billing information" });
    }
  });

  // Admin route to update organization plan (temporary fix)
  app.patch("/api/admin/organizations/:organizationId/plan", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const { plan } = req.body;
      
      if (!plan) {
        return res.status(400).json({ error: "Plan is required" });
      }

      const updated = await storage.updateOrganizationPlan(organizationId, plan);
      
      if (!updated) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json({ success: true, organization: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update organization plan" });
    }
  });

  // Get usage statistics for organization
  app.get("/api/billing/:organizationId/usage", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const usage = await storage.getOrganizationUsage(organizationId);
      
      if (!usage) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(usage);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage information" });
    }
  });

  // Create Stripe checkout session
  app.post("/api/billing/checkout", async (req, res) => {
    try {
      const { organizationId, plan, successUrl, cancelUrl } = req.body;
      
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Import billing service dynamically
      const { BillingService } = await import("./billing.js");
      
      // For organizations, we'll use a mock customer ID based on organization ID
      // In production, you'd want to store stripe customer info in a separate table
      const customerId = `cus_org_${organizationId}`;
      
      // Create customer if doesn't exist (this is handled in development mode by BillingService)
      const customer = await BillingService.createCustomer(
        organization.name + "@example.com",
        organization.name,
        organizationId
      );

      const session = await BillingService.createCheckoutSession(
        customerId,
        plan,
        organizationId,
        successUrl,
        cancelUrl
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Create billing portal session
  app.post("/api/billing/portal", async (req, res) => {
    try {
      const { organizationId, returnUrl } = req.body;
      
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Use organization-based customer ID
      const customerId = `cus_org_${organizationId}`;

      const { BillingService } = await import("./billing.js");
      const session = await BillingService.createPortalSession(
        customerId,
        returnUrl
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Portal error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Stripe webhook handler
  app.post("/api/billing/webhook", async (req, res) => {
    try {
      const { stripe } = await import("./billing.js");
      const signature = req.headers['stripe-signature'] as string;
      
      if (!stripe) {
        return res.status(200).json({ received: true, message: "Stripe not configured in development mode" });
      }
      
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send('Webhook Error');
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          const organizationId = parseInt(session.metadata?.organizationId || '0');
          const plan = session.metadata?.plan;
          
          if (organizationId && plan) {
            await storage.updateOrganizationBilling(organizationId, {
              subscriptionPlan: plan,
              subscriptionStatus: 'active',
              stripeSubscriptionId: session.subscription as string
            });
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          const subOrgId = parseInt(subscription.metadata?.organizationId || '0');
          
          if (subOrgId) {
            await storage.updateOrganizationBilling(subOrgId, {
              subscriptionStatus: subscription.status,
              subscriptionPlan: subscription.metadata?.plan || 'basic'
            });
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  // === SUPPORT TICKET ROUTES ===

  // Get support tickets for organization
  app.get("/api/support/tickets/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const status = req.query.status as string;
      const category = req.query.category as string;
      
      let tickets;
      
      if (status) {
        tickets = await storage.getTicketsByStatus(status);
      } else if (category) {
        tickets = await storage.getTicketsByCategory(category);
      } else {
        tickets = await storage.getSupportTickets(organizationId, userId);
      }
      
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch support tickets" });
    }
  });

  // Get single support ticket
  app.get("/api/support/tickets/detail/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getSupportTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch support ticket" });
    }
  });

  // Create new support ticket
  app.post("/api/support/tickets", async (req, res) => {
    try {
      const ticketData = req.body;
      const ticket = await storage.createSupportTicket(ticketData);
      
      // Create notification for admins
      const notification = await storage.createNotification({
        userId: 1, // Admin user
        organizationId: ticket.organizationId || 1,
        type: "support",
        title: "New Support Ticket",
        message: `New ${ticket.category} ticket: ${ticket.title}`,
        data: [ticket.id] as [any, ...any[]],
        isRead: false,
        actionUrl: `/support/tickets/${ticket.id}`
      });

      // Broadcast notification if server instance is available
      if (serverInstance && serverInstance.broadcastNotification) {
        serverInstance.broadcastNotification(notification.userId, notification);
      }
      
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to create support ticket" });
    }
  });

  // Update support ticket
  app.put("/api/support/tickets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const ticket = await storage.updateSupportTicket(id, updateData);
      
      if (!ticket) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to update support ticket" });
    }
  });

  // Delete support ticket
  app.delete("/api/support/tickets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSupportTicket(id);
      
      if (!success) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete support ticket" });
    }
  });

  // Add message to support ticket
  app.post("/api/support/tickets/:ticketId/messages", async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messageData = { ...req.body, ticketId };
      const message = await storage.createSupportTicketMessage(messageData);
      
      // Get the ticket to send notification
      const ticket = await storage.getSupportTicket(ticketId);
      if (ticket) {
        // Notify the ticket creator if message is from admin
        let notifyUserId = ticket.userId;
        if (messageData.senderType === "user") {
          // If user sent message, notify admin/assignee
          notifyUserId = ticket.assignedTo || 1;
        }

        const notification = await storage.createNotification({
          userId: notifyUserId,
          organizationId: ticket.organizationId || 1,
          type: "support",
          title: "New Message",
          message: `New message on ticket: ${ticket.title}`,
          data: [ticket.id, message.id] as [any, ...any[]],
          isRead: false,
          actionUrl: `/support/tickets/${ticket.id}`
        });

        // Broadcast notification
        if (serverInstance && serverInstance.broadcastNotification) {
          serverInstance.broadcastNotification(notification.userId, notification);
        }
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to add message to support ticket" });
    }
  });

  // Get messages for a support ticket
  app.get("/api/support/tickets/:ticketId/messages", async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messages = await storage.getSupportTicketMessages(ticketId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch support ticket messages" });
    }
  });

  // Messages endpoints
  app.get("/api/messages/conversations", async (req, res) => {
    try {
      const { userId = 1 } = req.query; // In real app, get from auth
      const conversations = await storage.getConversations(parseInt(userId.toString()));
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messages/project/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const messages = await storage.getProjectMessages(projectId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      // Create notification for message recipients
      const project = await storage.getProject(messageData.projectId);
      if (project) {
        // Get project participants (client and team members)
        const participants = await storage.getProjectParticipants(messageData.projectId);
        
        for (const participant of participants) {
          // Don't notify the sender
          if (participant.id !== messageData.senderId) {
            await storage.createNotification({
              userId: participant.id,
              organizationId: project.organizationId || 1,
              type: "message",
              title: "New Message",
              message: `New message in project: ${project.title}`,
              data: [messageData.projectId, message.id, project.title, participant.name] as [any, ...any[]]
            });
          }
        }
      }

      // Broadcast real-time notification
      if (serverInstance && serverInstance.wss) {
        const notificationData = {
          type: 'message:new',
          data: {
            projectId: messageData.projectId,
            message: message,
            projectName: project?.title
          }
        };

        serverInstance.wss.clients.forEach((client: any) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(notificationData));
          }
        });
      }

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid message data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/messages/project/:projectId/read", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { userId } = req.body;
      
      await storage.markProjectMessagesAsRead(projectId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Direct messaging endpoints for admin-client conversations
  app.get("/api/messages/client-conversations", async (req, res) => {
    try {
      const conversations = await storage.getClientConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client conversations" });
    }
  });

  app.get("/api/messages/direct/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const messages = await storage.getDirectMessages(clientId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch direct messages" });
    }
  });

  app.post("/api/messages/direct", async (req, res) => {
    try {
      const messageData = insertDirectMessageSchema.parse(req.body);
      
      const message = await storage.createDirectMessage(messageData);
      
      // Create notification for the recipient
      const client = await storage.getClient(messageData.clientId);
      if (client && messageData.senderType === 'admin') {
        // Notify the client about the new message
        await storage.createNotification({
          userId: client.id,
          organizationId: 1, // TODO: get from auth context
          type: "direct_message",
          title: "New Message from Admin",
          message: `You have received a new message from the admin team.`,
          data: [messageData.clientId, message.id, "Admin"] as [any, ...any[]]
        });
      }

      // Broadcast real-time notification
      if (serverInstance && serverInstance.wss) {
        const notificationData = {
          type: 'direct_message:new',
          data: {
            clientId: messageData.clientId,
            message: message
          }
        };

        serverInstance.wss.clients.forEach((client: any) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(notificationData));
          }
        });
      }

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid direct message data", details: error.errors });
      }
      console.error("Failed to send direct message:", error);
      res.status(500).json({ error: "Failed to send direct message" });
    }
  });

  app.patch("/api/messages/direct/:clientId/read", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { userId } = req.body;
      
      await storage.markDirectMessagesAsRead(clientId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark direct messages as read" });
    }
  });

  // Team member messaging endpoints for admin-team conversations
  app.get("/api/messages/team-conversations", async (req, res) => {
    try {
      const conversations = await storage.getTeamMemberConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team member conversations" });
    }
  });

  app.get("/api/messages/team-direct/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getTeamDirectMessages(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team direct messages" });
    }
  });

  app.post("/api/messages/team-direct", async (req, res) => {
    try {
      const messageData = insertTeamDirectMessageSchema.parse({
        receiverId: req.body.receiverId,
        senderId: req.body.senderId,
        senderType: req.body.senderType,
        content: req.body.content
      });
      
      const message = await storage.createTeamDirectMessage(messageData);
      
      // Create notification for the recipient
      const recipient = await storage.getUser(messageData.receiverId);
      if (recipient && messageData.senderType === 'admin') {
        // Notify the team member about the new message
        await storage.createNotification({
          userId: recipient.id,
          organizationId: 1, // TODO: get from auth context
          type: "team_direct_message",
          title: "New Message from Admin",
          message: `You have received a new message from the admin.`,
          data: [messageData.senderId, message.id, "Admin"] as [any, ...any[]]
        });
      }

      // Broadcast real-time notification
      if (serverInstance && serverInstance.wss) {
        const notificationData = {
          type: 'team_direct_message:new',
          data: {
            receiverId: messageData.receiverId,
            message: message
          }
        };

        serverInstance.wss.clients.forEach((client: any) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(notificationData));
          }
        });
      }

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid team direct message data", details: error.errors });
      }
      console.error("Failed to send team direct message:", error);
      res.status(500).json({ error: "Failed to send team direct message" });
    }
  });

  app.patch("/api/messages/team-direct/:userId/read", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { userId: currentUserId } = req.body;
      
      await storage.markTeamDirectMessagesAsRead(userId, currentUserId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark team direct messages as read" });
    }
  });

  // Test endpoint to create sample notifications (for development)
  app.post("/api/notifications/test", async (req, res) => {
    try {
      const { userId = 1 } = req.body;
      
      const testNotification = {
        userId: parseInt(userId),
        organizationId: 1,
        type: "test",
        title: "Test Notification",
        message: `This is a test notification created at ${new Date().toLocaleTimeString()}`,
        data: [true, Date.now()] as [any, ...any[]],
        isRead: false,
        actionUrl: "/dashboard"
      };
      
      const notification = await storage.createNotification(testNotification);
      
      // Broadcast the new notification via WebSocket
      if (serverInstance && serverInstance.broadcastNotification) {
        serverInstance.broadcastNotification(notification.userId, notification);
      }
      
      res.status(201).json({ message: "Test notification created", notification });
    } catch (error) {
      res.status(500).json({ error: "Failed to create test notification" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket Setup for real-time notifications
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws' // Use a specific path to avoid conflicts with Vite
  });
  const userConnections = new Map<number, Set<any>>();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection on /api/ws');
    
    // Track if this connection is authenticated
    let isAuthenticated = false;
    let connectedUserId: number | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.userId) {
          // Associate this connection with a user ID
          const userId = parseInt(data.userId);
          connectedUserId = userId;
          isAuthenticated = true;
          
          if (!userConnections.has(userId)) {
            userConnections.set(userId, new Set());
          }
          
          userConnections.get(userId)!.add(ws);
          console.log(`User ${userId} authenticated via WebSocket`);
          
          ws.send(JSON.stringify({ type: 'auth_success', userId }));
        } else if (data.type === 'ping') {
          // Respond to ping with pong
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    // Clean up on disconnect
    ws.on('close', (code, reason) => {
      console.log(`WebSocket disconnected: ${code} ${reason}`);
      if (isAuthenticated && connectedUserId) {
        const userSockets = userConnections.get(connectedUserId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            userConnections.delete(connectedUserId);
          }
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  // Add method to broadcast notifications to users
  (httpServer as any).broadcastNotification = (userId: number, notification: any) => {
    const userSockets = userConnections.get(userId);
    if (userSockets && userSockets.size > 0) {
      const message = JSON.stringify({
        type: 'notification',
        data: notification
      });
      
      userSockets.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      });
    }
  };

  // Assign server instance for use in routes
  serverInstance = httpServer;

  return httpServer;
}
