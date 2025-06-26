import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique(), // Clerk user ID
  supabaseId: uuid("supabase_id").unique(), // Supabase auth user ID
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  specialization: text("specialization"), // developer, designer, project_manager
  // Company information
  companyName: text("company_name"),
  companyRole: text("company_role"), // founder, manager, freelancer, etc.
  industry: text("industry"),
  companySize: text("company_size"), // 1-10, 11-50, 51-200, 200+
  // Subscription information (moved from organizations)
  subscriptionPlan: text("subscription_plan").default("solo"), // solo, pro
  subscriptionStatus: text("subscription_status").default("active"), // active, canceled, past_due
  maxProjects: integer("max_projects").default(3),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  trialStartDate: timestamp("trial_start_date"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
});

// Clerk Organizations - company/team level management
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  clerkOrgId: text("clerk_org_id").notNull().unique(), // Clerk organization ID
  name: text("name").notNull(),
  slug: text("slug").unique(), // URL-friendly name
  logo: text("logo"), // Organization logo URL
  plan: text("plan").default("pro_trial"), // pro_trial, solo, pro
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStatus: text("subscription_status").default("active"), // active, canceled, past_due
  maxMembers: integer("max_members").default(-1), // -1 = unlimited
  maxProjects: integer("max_projects").default(-1), // -1 = unlimited  
  maxStorage: integer("max_storage").default(107374182400), // 100GB in bytes
  storageUsed: integer("storage_used").default(0),
  createdBy: text("created_by").notNull(), // Clerk user ID who created org
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization memberships - tracks user roles within organizations
export const organizationMemberships = pgTable("organization_memberships", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  clerkUserId: text("clerk_user_id").notNull(), // Clerk user ID
  role: text("role").notNull(), // admin, member
  permissions: jsonb("permissions").$type<string[]>().default([]),
  joinedAt: timestamp("joined_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Organization invitations - tracks pending invites to organizations
export const organizationInvitations = pgTable("organization_invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  clerkInvitationId: text("clerk_invitation_id").unique(), // Clerk invitation ID
  email: text("email").notNull(),
  role: text("role").notNull(), // admin, member
  invitedBy: text("invited_by").notNull(), // Clerk user ID who sent invite
  status: text("status").default("pending"), // pending, accepted, expired, revoked
  expiresAt: timestamp("expires_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User collaborations - direct user-to-user relationships (project-specific)
export const userCollaborations = pgTable("user_collaborations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User who owns the workspace
  collaboratorId: integer("collaborator_id").notNull(), // User who is invited to collaborate
  role: text("role").notNull(), // team_member, client
  permissions: jsonb("permissions").$type<string[]>().default([]), // Granular permissions
  status: text("status").default("active"), // active, suspended, removed
  createdAt: timestamp("created_at").defaultNow(),
});

// User invitations - direct invitations to collaborate
export const userInvitations = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // team_member, client, admin
  specialization: text("specialization"), // developer, designer, project_manager
  invitedBy: integer("invited_by").notNull(), // User who sent the invitation
  projectId: integer("project_id"), // Optional: specific project invitation
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  // Enhanced security fields
  invitationType: text("invitation_type").notNull().default("project"), // project, organization, client
  portalAccess: jsonb("portal_access").$type<{
    projects?: number[];
    permissions?: string[];
    onboardingFlow?: string;
  }>().default({}),
  status: text("status").notNull().default("pending"), // pending, accepted, expired, revoked
  acceptedBy: integer("accepted_by"), // User ID who accepted (for audit)
  revokedBy: integer("revoked_by"), // User ID who revoked (for audit)
  revokedAt: timestamp("revoked_at"),
  usedAt: timestamp("used_at"), // Track when token was actually used
  ipAddress: text("ip_address"), // Track signup IP for security
  userAgent: text("user_agent"), // Track signup user agent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invitation audit trail - tracks all invitation actions for security and compliance
export const invitationAudit = pgTable("invitation_audit", {
  id: serial("id").primaryKey(),
  invitationId: integer("invitation_id").notNull(),
  action: text("action").notNull(), // sent, accepted, rejected, expired, revoked, validated
  performedBy: integer("performed_by"), // User who performed the action (null for system actions)
  metadata: jsonb("metadata").$type<{
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    previousValues?: Record<string, any>;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role assignments audit trail - tracks all role changes
export const roleAssignments = pgTable("role_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  assignedRole: text("assigned_role").notNull(), // admin, team_member, client
  previousRole: text("previous_role"), // For tracking changes
  assignedBy: integer("assigned_by").notNull(), // Admin who assigned the role
  projectId: integer("project_id"), // If role is project-specific
  reason: text("reason"), // Optional reason for role assignment
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"), // For temporary roles
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  avatar: text("avatar"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(), // User who created this client
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  clientId: integer("client_id").notNull(),
  ownerId: integer("owner_id").notNull(), // User who owns this project
  organizationId: integer("organization_id"), // Organization this project belongs to
  status: text("status").notNull().default("active"), // active, completed, paused, cancelled
  progress: integer("progress").default(0),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  budgetUsed: decimal("budget_used", { precision: 10, scale: 2 }).default("0"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  image: text("image"),
  priority: text("priority").default("medium"), // low, medium, high
  teamMembers: jsonb("team_members").$type<string[]>().default([]), // Deprecated: use project_team_members table
  tags: jsonb("tags").$type<string[]>().default([]),
  onboardingFormId: integer("onboarding_form_id"), // Reference to assigned onboarding form
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project team member assignments with roles
export const projectTeamMembers = pgTable("project_team_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(), // project_manager, developer, designer, reviewer, client
  permissions: jsonb("permissions").$type<string[]>().default([]), // project-specific permissions
  assignedBy: integer("assigned_by").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  order: integer("order").default(0),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // milestone_completed, message_received, document_uploaded, payment_received
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id"),
  clientId: integer("client_id"),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // pdf, doc, image, etc.
  url: text("url").notNull(),
  size: integer("size"), // in bytes
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedBy: integer("uploaded_by"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  senderId: integer("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // client, team_member
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

// Direct messages between admin and clients
export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  senderId: integer("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // admin, client
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

// Direct messages between admin and team members
export const teamDirectMessages = pgTable("team_direct_messages", {
  id: serial("id").primaryKey(),
  receiverId: integer("receiver_id").notNull(), // team member receiving the message
  senderId: integer("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // admin, team_member
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

// Onboarding forms for dynamic client intake
export const onboardingForms = pgTable("onboarding_forms", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(), // User who owns this form
  organizationId: integer("organization_id").notNull(), // Organization this form belongs to
  projectId: integer("project_id"), // Optional: form can be project-specific
  title: text("title").notNull(),
  description: text("description"),
  fields: jsonb("fields").$type<any[]>().notNull(), // Dynamic form fields
  isTemplate: boolean("is_template").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form submissions from clients
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  projectId: integer("project_id").notNull(),
  clientId: integer("client_id").notNull(),
  responses: jsonb("responses").$type<Record<string, any>>().notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  isCompleted: boolean("is_completed").default(true),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
});

// Project comments and threads
export const projectComments = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  parentId: integer("parent_id"), // For threading
  authorId: integer("author_id").notNull(),
  authorType: text("author_type").notNull(), // admin, team_member, client
  content: text("content").notNull(),
  mentions: jsonb("mentions").$type<number[]>().default([]), // User IDs mentioned
  attachments: jsonb("attachments").$type<string[]>().default([]), // File URLs
  status: text("status").default("open"), // open, in_progress, resolved
  priority: text("priority").default("normal"), // low, normal, high, urgent
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by"),
});

// Real-time notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  organizationId: integer("organization_id"), // Add organization context for notifications
  type: text("type").notNull(), // comment, mention, project_update, form_submission, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<any>().default({}), // Additional data - flexible structure
  isRead: boolean("is_read").default(false),
  actionUrl: text("action_url"), // URL to navigate when clicked
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Support tickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  organizationId: integer("organization_id"), // Organization this ticket belongs to
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // bug, feature, billing, support
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("open"), // open, in_progress, resolved, closed
  assignedTo: integer("assigned_to"),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Support ticket messages
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  senderId: integer("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // user, admin
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  isInternal: boolean("is_internal").default(false), // Internal admin notes
  createdAt: timestamp("created_at").defaultNow(),
});

// File uploads and assets
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(), // User who owns this asset
  organizationId: integer("organization_id"), // Organization this asset belongs to
  projectId: integer("project_id"), // Optional: can be user-wide
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  type: text("type").notNull(), // image, document, video, etc.
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // bytes
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  uploadedBy: integer("uploaded_by").notNull(),
  folder: text("folder").default("root"), // User folder structure
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project tasks for Kanban
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo"), // todo, in_progress, review, done
  priority: text("priority").default("medium"), // low, medium, high, urgent
  assignedTo: integer("assigned_to"),
  estimatedHours: decimal("estimated_hours", { precision: 4, scale: 1 }),
  actualHours: decimal("actual_hours", { precision: 4, scale: 1 }),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  position: integer("position").default(0), // For drag & drop ordering
  labels: jsonb("labels").$type<string[]>().default([]),
  checklist: jsonb("checklist").$type<any[]>().default([]),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project designs (Figma, funnel designs, etc.)
export const projectDesigns = pgTable("project_designs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  type: text("type").notNull(), // figma, funnel, wireframe, mockup
  originalUrl: text("original_url"), // Original Figma URL or source
  version: text("version").default("1.0"),
  status: text("status").default("review"), // draft, review, approved, changes_needed
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Design comments with status tracking
export const designComments = pgTable("design_comments", {
  id: serial("id").primaryKey(),
  designId: integer("design_id").notNull(),
  parentId: integer("parent_id"), // For threading
  authorId: integer("author_id").notNull(),
  authorType: text("author_type").notNull(), // admin, team_member, client
  content: text("content").notNull(),
  status: text("status").default("pending"), // pending, in_progress, completed
  priority: text("priority").default("normal"), // low, normal, high, urgent
  position: jsonb("position").$type<{x: number; y: number}>(), // Position on design for pinpoint comments
  attachments: jsonb("attachments").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertOrganizationInvitationSchema = createInsertSchema(organizationInvitations).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  joinedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  startDate: true,
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  completedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  sentAt: true,
});

export const insertTeamDirectMessageSchema = createInsertSchema(teamDirectMessages).omit({
  id: true,
  sentAt: true,
});

// New table insert schemas
export const insertUserCollaborationSchema = createInsertSchema(userCollaborations).omit({
  id: true,
  createdAt: true,
});

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  token: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvitationAuditSchema = createInsertSchema(invitationAudit).omit({
  id: true,
  createdAt: true,
});

export const insertRoleAssignmentSchema = createInsertSchema(roleAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertOnboardingFormSchema = createInsertSchema(onboardingForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  submittedAt: true,
});

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTeamMemberSchema = createInsertSchema(projectTeamMembers).omit({
  id: true,
  assignedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectDesignSchema = createInsertSchema(projectDesigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDesignCommentSchema = createInsertSchema(designComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type InsertOrganizationMembership = z.infer<typeof insertOrganizationMembershipSchema>;

export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type InsertOrganizationInvitation = z.infer<typeof insertOrganizationInvitationSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;

export type TeamDirectMessage = typeof teamDirectMessages.$inferSelect;
export type InsertTeamDirectMessage = z.infer<typeof insertTeamDirectMessageSchema>;

// New table types
export type UserCollaboration = typeof userCollaborations.$inferSelect;
export type InsertUserCollaboration = z.infer<typeof insertUserCollaborationSchema>;

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;

export type InvitationAudit = typeof invitationAudit.$inferSelect;
export type InsertInvitationAudit = z.infer<typeof insertInvitationAuditSchema>;

export type RoleAssignment = typeof roleAssignments.$inferSelect;
export type InsertRoleAssignment = z.infer<typeof insertRoleAssignmentSchema>;

export type OnboardingForm = typeof onboardingForms.$inferSelect;
export type InsertOnboardingForm = z.infer<typeof insertOnboardingFormSchema>;

export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;

export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;

export type ProjectTeamMember = typeof projectTeamMembers.$inferSelect;
export type InsertProjectTeamMember = z.infer<typeof insertProjectTeamMemberSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

export type ProjectDesign = typeof projectDesigns.$inferSelect;
export type InsertProjectDesign = z.infer<typeof insertProjectDesignSchema>;

export type DesignComment = typeof designComments.$inferSelect;
export type InsertDesignComment = z.infer<typeof insertDesignCommentSchema>;

// Extended types for API responses
export type ProjectWithClient = Project & {
  client: Client;
  milestones: Milestone[];
  documents: Document[];
};

export type ClientWithProjects = Client & {
  projects: Project[];
};

export type ActivityWithDetails = Activity & {
  project?: Project;
  client?: Client;
};

// Enhanced extended types for the new user-centric system
export type UserWithCollaborations = User & {
  collaborations: UserCollaboration[];
  invitations: UserInvitation[];
};

export type ProjectWithDetails = Project & {
  client: Client;
  owner: User;
  milestones: Milestone[];
  documents: Document[];
  tasks: ProjectTask[];
  comments: ProjectComment[];
  assets: Asset[];
  designs: ProjectDesign[];
  teamMembers: (ProjectTeamMember & { user: User })[];
};

export type ProjectWithTeamMembers = Project & {
  client: Client;
  owner: User;
  teamMembers: (ProjectTeamMember & { user: User })[];
};

export type DesignWithComments = ProjectDesign & {
  comments: (DesignComment & { author: User })[];
  project?: Project;
};

export type UserWithProjects = User & {
  ownedProjects: Project[];
  collaboratedProjects: (ProjectTeamMember & { project: Project })[];
};

export type CommentWithAuthor = ProjectComment & {
  author: User;
  replies?: CommentWithAuthor[];
};

export type TaskWithAssignee = ProjectTask & {
  assignee?: User;
  project?: Project;
};

export type NotificationWithDetails = Notification & {
  user: User;
};

export type TicketWithMessages = SupportTicket & {
  messages: (SupportTicketMessage & { sender: User })[];
  assignee?: User;
  user: User;
};

export type FormWithSubmissions = OnboardingForm & {
  submissions: (FormSubmission & { client: Client })[];
  owner: User;
  project?: Project;
};

// Legacy compatibility types - maintain backwards compatibility
export type TeamInvitation = UserInvitation;
export type InsertTeamInvitation = InsertUserInvitation;

// Organization types for billing integration
export type OrganizationWithBilling = Organization & {
  memberships?: OrganizationMembership[];
  currentPlan: PlanDetails;
  usage: {
    projects: number;
    collaborators: number;
    storage: number;
  };
};

// Enhanced organization types
export type OrganizationWithUsage = Organization & {
  usage: {
    projects: number;
    collaborators: number;
    storage: number;
  };
};

export type CommentWithReplies = DesignComment & {
  author: User;
  replies?: CommentWithReplies[];
};

// Billing Plan Types and Constants
export const BILLING_PLANS = {
  solo: {
    id: 'solo',
    name: 'Solo',
    price: 17,
    yearlyPrice: 13, // 25% savings: $17 * 12 * 0.75 / 12 = $12.75, rounded to $13
    interval: 'month',
    features: [
      'Up to 3 projects',
      'Personal workspace only',
      '5GB storage',
      'Standard support'
    ],
    limits: {
      projects: 3,
      collaborators: 0, // Solo plan - no collaborators allowed
      storage: 5 * 1024 * 1024 * 1024 // 5GB in bytes
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 37,
    yearlyPrice: 28, // 25% savings: $37 * 12 * 0.75 / 12 = $27.75, rounded to $28
    interval: 'month',
    features: [
      'Unlimited projects',
      'Unlimited collaborators',
      'Advanced team collaboration',
      'Priority support',
      '100GB storage',
      'Standard reporting'
    ],
    limits: {
      projects: -1, // unlimited
      collaborators: -1, // unlimited
      storage: 100 * 1024 * 1024 * 1024 // 100GB in bytes
    }
  }
} as const;

export type BillingPlan = keyof typeof BILLING_PLANS;
export type PlanDetails = typeof BILLING_PLANS[BillingPlan];

export type UserWithBilling = User & {
  collaborators: UserCollaboration[];
  projects: Project[];
  currentPlan: PlanDetails;
  usage: {
    projects: number;
    collaborators: number;
    storage: number;
  };
};
