import { 
  users, clients, projects, milestones, activities, documents, messages, directMessages, teamDirectMessages, notifications, userInvitations, userCollaborations, onboardingForms, formSubmissions, projectComments, assets, projectTasks, supportTickets, supportTicketMessages, projectTeamMembers, invitationAudit, roleAssignments, organizations,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Project, type InsertProject, type ProjectWithClient, type ProjectWithTeamMembers,
  type Milestone, type InsertMilestone,
  type Activity, type InsertActivity, type ActivityWithDetails,
  type Document, type InsertDocument,
  type Message, type InsertMessage,
  type DirectMessage, type InsertDirectMessage,
  type TeamDirectMessage, type InsertTeamDirectMessage,
  type Notification, type InsertNotification,
  type UserInvitation, type InsertUserInvitation,
  type UserCollaboration, type InsertUserCollaboration,
  type InvitationAudit, type InsertInvitationAudit,
  type RoleAssignment, type InsertRoleAssignment,
  type OnboardingForm, type InsertOnboardingForm,
  type FormSubmission, type InsertFormSubmission, type FormWithSubmissions,
  type ProjectComment, type InsertProjectComment, type CommentWithAuthor,
  type Asset, type InsertAsset,
  type ProjectTask, type InsertProjectTask, type TaskWithAssignee,
  type ProjectTeamMember, type InsertProjectTeamMember,
  type ClientWithProjects,
  type UserWithBilling,
  type SupportTicket, type InsertSupportTicket,
  type SupportTicketMessage, type InsertSupportTicketMessage,
  type TicketWithMessages,
  type TeamInvitation, type InsertTeamInvitation,
  type Organization, type OrganizationWithBilling, type OrganizationWithUsage,
  BILLING_PLANS
} from "@shared/schema";

// Local types not in schema
interface UserRole {
  id: number;
  userId: number;
  organizationId: number;
  role: string;
  permissions: string[];
  createdAt: Date;
}

export interface IStorage {
  // System
  testConnection(): Promise<boolean>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClients(organizationId?: number): Promise<Client[]>;
  getClient(id: number, organizationId?: number): Promise<Client | undefined>;
  getClientByEmail(email: string, organizationId?: number): Promise<Client | undefined>;
  getClientWithProjects(id: number, organizationId?: number): Promise<ClientWithProjects | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Projects
  getProjects(organizationId?: number): Promise<Project[]>;
  getProjectsForUser(userId: number, organizationId: number): Promise<ProjectWithTeamMembers[]>;
  getProject(id: number, organizationId?: number): Promise<Project | undefined>;
  getProjectWithClient(id: number, organizationId?: number): Promise<ProjectWithClient | undefined>;
  getProjectWithTeamMembers(id: number, organizationId?: number): Promise<ProjectWithTeamMembers | undefined>;
  getProjectsByClient(clientId: number, organizationId?: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Project Team Members
  getProjectTeamMembers(projectId: number): Promise<(ProjectTeamMember & { user: User })[]>;
  addProjectTeamMember(member: InsertProjectTeamMember): Promise<ProjectTeamMember>;
  updateProjectTeamMember(id: number, member: Partial<InsertProjectTeamMember>): Promise<ProjectTeamMember | undefined>;
  removeProjectTeamMember(id: number): Promise<boolean>;
  getUserProjectRole(projectId: number, userId: number): Promise<ProjectTeamMember | undefined>;

  // Milestones
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: number): Promise<boolean>;

  // Activities
  getActivities(limit?: number): Promise<ActivityWithDetails[]>;
  getActivitiesByProject(projectId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Documents
  getDocumentsByProject(projectId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;

  // Messages
  getMessagesByProject(projectId: number): Promise<Message[]>;
  getProjectMessages(projectId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;
  markProjectMessagesAsRead(projectId: number, userId: number): Promise<boolean>;
  getConversations(userId: number): Promise<any[]>;
  getProjectParticipants(projectId: number): Promise<any[]>;

  // Direct messaging methods
  createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage>;
  getDirectMessages(clientId: number): Promise<DirectMessage[]>;
  markDirectMessagesAsRead(clientId: number, userId: number): Promise<boolean>;
  getClientConversations(): Promise<any[]>;
  
  // Team direct messaging methods
  createTeamDirectMessage(message: InsertTeamDirectMessage): Promise<TeamDirectMessage>;
  getTeamDirectMessages(userId: number): Promise<TeamDirectMessage[]>;
  markTeamDirectMessagesAsRead(userId: number, currentUserId: number): Promise<boolean>;
  getTeamMemberConversations(): Promise<any[]>;

  // Notifications
  getNotifications(params: { userId: number; isRead?: boolean; limit?: number }): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<number>;
  deleteNotification(id: number): Promise<boolean>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Team Management
  getTeamMembers(organizationId: number): Promise<(User & { role: string; status: string })[]>;
  getTeamInvitations(organizationId: number): Promise<TeamInvitation[]>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  resendTeamInvitation(id: number): Promise<TeamInvitation | undefined>;
  cancelTeamInvitation(id: number): Promise<boolean>;
  updateUserRole(userId: number, organizationId: number, role: string): Promise<UserRole | undefined>;
  suspendUser(userId: number, suspend: boolean): Promise<boolean>;
  updateUserStatus(userId: number, status: string): Promise<boolean>;
  removeUserFromOrganization(userId: number, organizationId: number): Promise<boolean>;

  // Enhanced Invitation System
  validateInvitationToken(token: string): Promise<UserInvitation | null>;
  createUserInvitation(invitation: InsertUserInvitation): Promise<UserInvitation>;
  acceptInvitation(token: string, userId: number, metadata?: { ipAddress?: string; userAgent?: string }): Promise<UserInvitation | null>;
  revokeInvitation(invitationId: number, revokedBy: number, reason?: string): Promise<boolean>;
  getInvitationsByEmail(email: string): Promise<UserInvitation[]>;
  getInvitationById(id: number): Promise<UserInvitation | null>;
  markInvitationAsExpired(id: number): Promise<boolean>;
  
  // Audit Trail
  logInvitationAction(action: string, invitationId: number, performedBy?: number, metadata?: any): Promise<InvitationAudit>;
  createRoleAssignment(assignment: InsertRoleAssignment): Promise<RoleAssignment>;
  getRoleAssignmentHistory(userId: number): Promise<RoleAssignment[]>;

  // Onboarding Forms
  getOnboardingForms(organizationId: number): Promise<OnboardingForm[]>;
  getOnboardingForm(id: number): Promise<OnboardingForm | undefined>;
  getOnboardingFormByProject(projectId: number): Promise<OnboardingForm | undefined>;
  getOnboardingFormWithSubmissions(id: number): Promise<FormWithSubmissions | undefined>;
  createOnboardingForm(form: InsertOnboardingForm): Promise<OnboardingForm>;
  updateOnboardingForm(id: number, form: Partial<InsertOnboardingForm>): Promise<OnboardingForm | undefined>;
  deleteOnboardingForm(id: number): Promise<boolean>;
  
  // Form Submissions
  getFormSubmissions(formId: number): Promise<FormSubmission[]>;
  getFormSubmission(id: number): Promise<FormSubmission | undefined>;
  getFormSubmissionsByProjectAndClient(projectId: number, clientId: number): Promise<FormSubmission[]>;
  getFormSubmissionsByProject(projectId: number): Promise<FormSubmission[]>;
  getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  updateFormSubmission(id: number, submission: Partial<InsertFormSubmission>): Promise<FormSubmission | undefined>;
  markSubmissionAsReviewed(id: number, reviewedBy: number): Promise<FormSubmission | undefined>;

  // Project Comments
  getProjectComments(projectId: number): Promise<CommentWithAuthor[]>;
  getComment(id: number): Promise<ProjectComment | undefined>;
  getCommentThread(parentId: number): Promise<CommentWithAuthor[]>;
  createProjectComment(comment: InsertProjectComment): Promise<ProjectComment>;
  updateComment(id: number, comment: Partial<InsertProjectComment>): Promise<ProjectComment | undefined>;
  deleteComment(id: number): Promise<boolean>;
  resolveComment(id: number, resolvedBy: number): Promise<ProjectComment | undefined>;

  // Assets
  getAssets(organizationId: number, projectId?: number, folder?: string): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;
  getAssetsByTags(organizationId: number, tags: string[]): Promise<Asset[]>;
  getAssetsByType(organizationId: number, type: string): Promise<Asset[]>;
  getFolders(organizationId: number): Promise<string[]>;

  // Project Tasks
  getProjectTasks(projectId: number): Promise<TaskWithAssignee[]>;
  getProjectTask(id: number): Promise<ProjectTask | undefined>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: number, task: Partial<InsertProjectTask>): Promise<ProjectTask | undefined>;
  deleteProjectTask(id: number): Promise<boolean>;
  updateTaskStatus(id: number, status: string): Promise<ProjectTask | undefined>;
  updateTaskPosition(id: number, position: number): Promise<ProjectTask | undefined>;
  getTasksByStatus(projectId: number, status: string): Promise<TaskWithAssignee[]>;

  // Support Tickets
  getSupportTickets(organizationId: number): Promise<SupportTicket[]>;
  getTicketsByStatus(status: string): Promise<SupportTicket[]>;
  getTicketsByCategory(category: string): Promise<SupportTicket[]>;
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: number, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  deleteSupportTicket(id: number): Promise<boolean>;
  createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage>;
  getSupportTicketMessages(ticketId: number): Promise<SupportTicketMessage[]>;

  // Organization Management
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationWithUsage(id: number): Promise<OrganizationWithUsage | undefined>;
  getOrganizationWithBilling(id: number): Promise<OrganizationWithBilling | undefined>;
  getOrganizationUsage(id: number): Promise<{ projects: number; collaborators: number; storage: number }>;
  updateOrganizationBilling(id: number, data: any): Promise<Organization | undefined>;
  updateOrganizationPlan(organizationId: number, plan: string): Promise<any>;
  updateUser(id: number, data: any): Promise<User | undefined>;
  getAllUserRoles(organizationId: number): Promise<UserRole[]>;

  // Stats
  getStats(): Promise<{
    activeProjects: number;
    totalClients: number;
    monthlyRevenue: number;
    hoursThisMonth: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private clients: Map<number, Client> = new Map();
  private projects: Map<number, Project> = new Map();
  private milestones: Map<number, Milestone> = new Map();
  private activities: Map<number, Activity> = new Map();
  private documents: Map<number, Document> = new Map();
  private messages: Map<number, Message> = new Map();
  private directMessages: Map<number, DirectMessage> = new Map();
  private teamDirectMessages: Map<number, TeamDirectMessage> = new Map();
  private notifications: Map<number, Notification> = new Map();
  private teamInvitations: Map<number, TeamInvitation> = new Map();
  private userRoles: Map<number, UserRole> = new Map();
  private onboardingForms: Map<number, OnboardingForm> = new Map();
  private formSubmissions: Map<number, FormSubmission> = new Map();
  private projectComments: Map<number, ProjectComment> = new Map();
  private assets: Map<number, Asset> = new Map();
  private projectTasks: Map<number, ProjectTask> = new Map();
  private supportTickets: Map<number, SupportTicket> = new Map();
  private supportTicketMessages: Map<number, SupportTicketMessage> = new Map();
  private projectTeamMembers: Map<number, ProjectTeamMember> = new Map();
  private organizations: Map<number, Organization> = new Map();
  private userInvitations: Map<number, UserInvitation> = new Map();
  private userCollaborations: Map<number, UserCollaboration> = new Map();
  private invitationAudits: Map<number, InvitationAudit> = new Map();
  private roleAssignments: Map<number, RoleAssignment> = new Map();
  
  private currentUserId = 1;
  private currentClientId = 1;
  private currentProjectId = 1;
  private currentMilestoneId = 1;
  private currentActivityId = 1;
  private currentDocumentId = 1;
  private currentMessageId = 1;
  private currentDirectMessageId = 1;
  private currentTeamDirectMessageId = 1;
  private currentNotificationId = 1;
  private currentTeamInvitationId = 1;
  private currentUserRoleId = 1;
  private currentOnboardingFormId = 1;
  private currentFormSubmissionId = 1;
  private currentProjectCommentId = 1;
  private currentAssetId = 1;
  private currentProjectTaskId = 1;
  private currentSupportTicketId = 1;
  private currentSupportTicketMessageId = 1;
  private currentProjectTeamMemberId = 1;
  private currentOrganizationId = 1;
  private currentUserInvitationId = 1;
  private currentUserCollaborationId = 1;
  private currentInvitationAuditId = 1;
  private currentRoleAssignmentId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create sample organization with billing info
    const sampleOrganization: Organization = {
      id: this.currentOrganizationId++,
      clerkOrgId: "org_mock_development",
      name: "Funnel Portals Agency",
      slug: "funnel-portals",
      logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80",
      plan: "pro",
      trialEndsAt: null,
      subscriptionStatus: "active",
      maxMembers: -1,
      maxProjects: -1,
      maxStorage: 107374182400,
      storageUsed: 0,
      createdBy: "user_mock_development_creator",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date()
    };
    this.organizations.set(sampleOrganization.id, sampleOrganization);

    // No sample clients - start with empty state for production

    // No sample projects - start with empty state for production

    // No sample activities - start with empty state for production

    // No sample notifications - start with empty state for production


    // Create sample users and roles
    const sampleUsers: User[] = [
      {
        id: this.currentUserId++,
        supabaseId: "00000000-0000-0000-0000-000000000001",
        username: "alex.thompson",
        email: "alex@funnelportals.com",
        name: "Alex Thompson",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
        specialization: "project_manager",
        companyName: "Funnel Portals Agency",
        companyRole: "founder",
        industry: "marketing",
        companySize: "11-50",
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        maxProjects: -1,
        stripeCustomerId: "cus_alex_123",
        stripeSubscriptionId: "sub_alex_123",
        createdAt: new Date("2024-01-15"),
        lastLoginAt: new Date(),
        isActive: true
      },
      {
        id: this.currentUserId++,
        supabaseId: "00000000-0000-0000-0000-000000000002",
        username: "sarah.johnson",
        email: "sarah@funnelportals.com",
        name: "Sarah Johnson",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face",
        specialization: "designer",
        companyName: "Creative Studios",
        companyRole: "senior_designer",
        industry: "design",
        companySize: "11-50",
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        maxProjects: 10,
        stripeCustomerId: "cus_sarah_123",
        stripeSubscriptionId: "sub_sarah_123",
        createdAt: new Date("2024-02-20"),
        lastLoginAt: new Date(Date.now() - 300000), // 5 min ago
        isActive: true
      },
      {
        id: this.currentUserId++,
        supabaseId: "00000000-0000-0000-0000-000000000003",
        username: "mike.chen",
        email: "mike@funnelportals.com",
        name: "Mike Chen",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
        specialization: "developer",
        companyName: "Tech Solutions",
        companyRole: "lead_developer",
        industry: "technology",
        companySize: "51-200",
        subscriptionPlan: "solo",
        subscriptionStatus: "active",
        maxProjects: 3,
        stripeCustomerId: "cus_mike_123",
        stripeSubscriptionId: "sub_mike_123",
        createdAt: new Date("2024-03-10"),
        lastLoginAt: new Date(Date.now() - 3600000), // 1 hour ago
        isActive: true
      }
    ];

    sampleUsers.forEach(user => this.users.set(user.id, user));

    // Create sample user roles
    const sampleUserRoles: UserRole[] = [
      {
        id: this.currentUserRoleId++,
        userId: 1,
        organizationId: 1,
        role: "admin",
        permissions: ["*"],
        createdAt: new Date("2024-01-15")
      },
      {
        id: this.currentUserRoleId++,
        userId: 2,
        organizationId: 1,
        role: "team_member",
        permissions: ["projects:read", "projects:write", "clients:read"],
        createdAt: new Date("2024-02-20")
      },
      {
        id: this.currentUserRoleId++,
        userId: 3,
        organizationId: 1,
        role: "team_member",
        permissions: ["projects:read", "projects:write", "clients:read"],
        createdAt: new Date("2024-03-10")
      }
    ];

    sampleUserRoles.forEach(role => this.userRoles.set(role.id, role));

    // No sample project team members - start with empty state for production

    // Create sample team invitations
    const sampleInvitations: TeamInvitation[] = [
      {
        id: this.currentTeamInvitationId++,
        email: "jenny@funnelportals.com",
        name: "Jenny Wilson",
        role: "team_member",
        specialization: "designer",
        invitedBy: 1,
        projectId: 1,
        token: "invitation-token-1",
        expiresAt: new Date(Date.now() + 6 * 86400000), // 6 days from now
        acceptedAt: null,
        invitationType: "project",
        portalAccess: { projects: [1], permissions: ["view", "edit"], onboardingFlow: "designer" },
        status: "pending",
        acceptedBy: null,
        revokedBy: null,
        revokedAt: null,
        usedAt: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000)
      },
      {
        id: this.currentTeamInvitationId++,
        email: "david@contractor.com",
        name: "David Martinez",
        role: "team_member",
        specialization: "developer",
        invitedBy: 2,
        projectId: 1,
        token: "invitation-token-2",
        expiresAt: new Date(Date.now() + 5 * 86400000), // 5 days from now
        acceptedAt: null,
        invitationType: "project",
        portalAccess: { projects: [1], permissions: ["view", "edit", "comment"], onboardingFlow: "developer" },
        status: "pending",
        acceptedBy: null,
        revokedBy: null,
        revokedAt: null,
        usedAt: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        updatedAt: new Date(Date.now() - 172800000)
      }
    ];

    sampleInvitations.forEach(invitation => this.teamInvitations.set(invitation.id, invitation));

    // Onboarding forms are created dynamically by users
    
    // Form submissions are created when clients submit onboarding forms

    // Create sample project comments
    const sampleProjectComments: ProjectComment[] = [
      {
        id: this.currentProjectCommentId++,
        projectId: 1,
        parentId: null, // Root comment
        authorId: 1,
        authorType: "admin",
        content: "Great progress on the e-commerce platform! The homepage design looks fantastic. I have a few suggestions for the checkout flow.",
        mentions: [2], // Mentioning user ID 2
        attachments: ["https://example.com/homepage-feedback.png"],
        status: "open",
        priority: "normal",
        tags: ["design", "review"],
        createdAt: new Date("2024-06-15T10:30:00"),
        updatedAt: new Date("2024-06-15T10:30:00"),
        resolvedAt: null,
        resolvedBy: null
      },
      {
        id: this.currentProjectCommentId++,
        projectId: 1,
        parentId: 1, // Reply to comment ID 1
        authorId: 2,
        authorType: "team_member",
        content: "Thanks for the feedback! I'll implement those checkout flow improvements today. @alex what do you think about adding a progress indicator?",
        mentions: [1], // Mentioning user ID 1 (alex)
        attachments: [],
        status: "in_progress",
        priority: "normal",
        tags: ["checkout", "ux"],
        createdAt: new Date("2024-06-15T14:20:00"),
        updatedAt: new Date("2024-06-15T14:20:00"),
        resolvedAt: null,
        resolvedBy: null
      },
      {
        id: this.currentProjectCommentId++,
        projectId: 1,
        parentId: 1, // Another reply to comment ID 1
        authorId: 1,
        authorType: "admin",
        content: "Progress indicator is a great idea! Also, let's add cart abandonment recovery emails.",
        mentions: [],
        attachments: [],
        status: "open",
        priority: "high",
        tags: ["email", "cart"],
        createdAt: new Date("2024-06-15T16:45:00"),
        updatedAt: new Date("2024-06-15T16:45:00"),
        resolvedAt: null,
        resolvedBy: null
      },
      {
        id: this.currentProjectCommentId++,
        projectId: 2,
        parentId: null, // Root comment for project 2
        authorId: 2,
        authorType: "team_member",
        content: "The analytics dashboard is coming along well. The data visualization charts are really impressive! Just need to optimize the loading times for large datasets.",
        mentions: [],
        attachments: ["https://example.com/dashboard-screenshot.png", "https://example.com/performance-report.pdf"],
        status: "open",
        priority: "medium",
        tags: ["performance", "optimization"],
        createdAt: new Date("2024-06-16T09:15:00"),
        updatedAt: new Date("2024-06-16T09:15:00"),
        resolvedAt: null,
        resolvedBy: null
      },
      {
        id: this.currentProjectCommentId++,
        projectId: 2,
        parentId: 4, // Reply to comment ID 4
        authorId: 3,
        authorType: "team_member",
        content: "I can help with the performance optimization. Let's implement data pagination and lazy loading for the charts.",
        mentions: [2],
        attachments: [],
        status: "in_progress",
        priority: "medium",
        tags: ["pagination", "lazy-loading"],
        createdAt: new Date("2024-06-16T11:30:00"),
        updatedAt: new Date("2024-06-16T11:30:00"),
        resolvedAt: null,
        resolvedBy: null
      },
      {
        id: this.currentProjectCommentId++,
        projectId: 3,
        parentId: null, // Root comment for project 3
        authorId: 1,
        authorType: "admin",
        content: "Security review completed for the FinTech app. Everything looks good! 🔒 The encryption implementation is solid.",
        mentions: [],
        attachments: ["https://example.com/security-audit.pdf"],
        status: "resolved",
        priority: "high",
        tags: ["security", "audit", "completed"],
        createdAt: new Date("2024-06-17T13:20:00"),
        updatedAt: new Date("2024-06-17T15:45:00"),
        resolvedAt: new Date("2024-06-17T15:45:00"),
        resolvedBy: 1
      },
      {
        id: this.currentProjectCommentId++,
        projectId: 1,
        parentId: null, // Another root comment for project 1
        authorId: 1,
        authorType: "client",
        content: "Love the new design! Could we make the call-to-action buttons more prominent? Maybe a different color scheme?",
        mentions: [2],
        attachments: [],
        status: "open",
        priority: "low",
        tags: ["design", "cta", "colors"],
        createdAt: new Date("2024-06-17T16:30:00"),
        updatedAt: new Date("2024-06-17T16:30:00"),
        resolvedAt: null,
        resolvedBy: null
      },
      {
        id: this.currentProjectCommentId++,
        projectId: 2,
        parentId: null, // Root comment with urgent priority
        authorId: 2,
        authorType: "team_member",
        content: "⚠️ URGENT: Found a critical bug in the data export feature. Users can't download their reports. Working on a fix now.",
        mentions: [1, 3],
        attachments: ["https://example.com/bug-report.png"],
        status: "open",
        priority: "urgent",
        tags: ["bug", "critical", "export"],
        createdAt: new Date("2024-06-18T08:15:00"),
        updatedAt: new Date("2024-06-18T08:15:00"),
        resolvedAt: null,
        resolvedBy: null
      }
    ];

    sampleProjectComments.forEach(comment => this.projectComments.set(comment.id, comment));

    // Sample Assets
    const sampleAssets: Asset[] = [
      // Brand Kit Assets
      {
        id: 1,
        ownerId: 1,
        organizationId: 1,
        projectId: null, // Organization-wide asset
        name: "company-logo.svg",
        originalName: "FunnelPortals_Logo_Final.svg",
        type: "image",
        mimeType: "image/svg+xml",
        size: 15420,
        url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
        thumbnailUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=100&h=100&fit=crop",
        uploadedBy: 1,
        folder: "brand-kit",
        tags: ["logo", "brand", "svg", "primary"],
        metadata: { colorProfile: "RGB", vector: true },
        createdAt: new Date("2024-01-15T10:00:00Z")
      },
      {
        id: 2,
        ownerId: 1,
        organizationId: 1,
        projectId: null,
        name: "brand-colors.png",
        originalName: "Brand_Color_Palette.png",
        type: "image",
        mimeType: "image/png",
        size: 89234,
        url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=300&fit=crop",
        thumbnailUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=100&h=100&fit=crop",
        uploadedBy: 1,
        folder: "brand-kit",
        tags: ["colors", "brand", "palette", "reference"],
        metadata: { primaryColor: "#6366f1", secondaryColor: "#8b5cf6" },
        createdAt: new Date("2024-01-15T10:30:00Z")
      },
      {
        id: 3,
        ownerId: 1,
        organizationId: 1,
        projectId: null,
        name: "typography-guide.pdf",
        originalName: "Typography_Guidelines_2024.pdf",
        type: "document",
        mimeType: "application/pdf",
        size: 2456780,
        url: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop",
        thumbnailUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=100&h=100&fit=crop",
        uploadedBy: 2,
        folder: "brand-kit",
        tags: ["typography", "fonts", "brand", "guidelines"],
        metadata: { primaryFont: "Inter", secondaryFont: "Playfair Display" },
        createdAt: new Date("2024-01-16T09:15:00Z")
      },
      // Project-specific Assets
      {
        id: 4,
        ownerId: 1,
        organizationId: 1,
        projectId: 1,
        name: "hero-image.jpg",
        originalName: "TechCorp_Hero_Image_v3.jpg",
        type: "image",
        mimeType: "image/jpeg",
        size: 1234567,
        url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
        thumbnailUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=100&fit=crop",
        uploadedBy: 2,
        folder: "website-assets",
        tags: ["hero", "website", "banner", "tech"],
        metadata: { width: 1920, height: 1080, optimization: "web" },
        createdAt: new Date("2024-02-01T14:20:00Z")
      },
      {
        id: 5,
        ownerId: 1,
        organizationId: 1,
        projectId: 1,
        name: "wireframes.fig",
        originalName: "TechCorp_Website_Wireframes_v2.fig",
        type: "design",
        mimeType: "application/octet-stream",
        size: 5678901,
        url: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&h=300&fit=crop",
        thumbnailUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=100&h=100&fit=crop",
        uploadedBy: 3,
        folder: "design-files",
        tags: ["wireframes", "design", "figma", "ux"],
        metadata: { tool: "Figma", version: "2.0", pages: 12 },
        createdAt: new Date("2024-02-05T11:45:00Z")
      },
      {
        id: 6,
        ownerId: 1,
        organizationId: 1,
        projectId: 2,
        name: "product-photos.zip",
        originalName: "GreenLeaf_Product_Photography.zip",
        type: "archive",
        mimeType: "application/zip",
        size: 45678901,
        url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
        thumbnailUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop",
        uploadedBy: 1,
        folder: "product-assets",
        tags: ["products", "photography", "ecommerce", "organic"],
        metadata: { fileCount: 24, totalSize: "45.6MB", resolution: "high" },
        createdAt: new Date("2024-03-01T16:30:00Z")
      },
      // Template Assets
      {
        id: 7,
        ownerId: 1,
        organizationId: 1,
        projectId: null,
        name: "email-template.html",
        originalName: "Standard_Email_Template_v1.html",
        type: "template",
        mimeType: "text/html",
        size: 12345,
        url: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=400&h=300&fit=crop",
        thumbnailUrl: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=100&h=100&fit=crop",
        uploadedBy: 2,
        folder: "templates",
        tags: ["email", "template", "marketing", "responsive"],
        metadata: { responsive: true, emailClient: "universal", version: "1.0" },
        createdAt: new Date("2024-01-20T13:10:00Z")
      },
      {
        id: 8,
        ownerId: 1,
        organizationId: 1,
        projectId: null,
        name: "social-media-kit.zip",
        originalName: "Social_Media_Asset_Kit_2024.zip",
        type: "archive",
        mimeType: "application/zip",
        size: 34567890,
        url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop",
        thumbnailUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop",
        uploadedBy: 1,
        folder: "social-media",
        tags: ["social", "templates", "instagram", "facebook", "linkedin"],
        metadata: { platforms: ["Instagram", "Facebook", "LinkedIn"], formats: ["story", "post", "cover"] },
        createdAt: new Date("2024-01-25T08:45:00Z")
      }
    ];

    sampleAssets.forEach(asset => this.assets.set(asset.id, asset));

    // No sample tasks - start with empty state for production

    // Create sample support tickets
    const sampleSupportTickets: SupportTicket[] = [
      {
        id: this.currentSupportTicketId++,
        userId: 1,
        organizationId: 1,
        title: "Login Issues with New Dashboard",
        description: "I'm having trouble logging into the new dashboard. The page keeps redirecting me to an error page after I enter my credentials.",
        category: "bug",
        priority: "high",
        status: "open",
        assignedTo: 1,
        attachments: [],
        createdAt: new Date("2024-12-18T09:30:00Z"),
        updatedAt: new Date("2024-12-18T09:30:00Z"),
        resolvedAt: null
      },
      {
        id: this.currentSupportTicketId++,
        userId: 2,
        organizationId: 1,
        title: "Feature Request: Dark Mode",
        description: "Would love to have a dark mode option for better usability during late night work sessions. This would greatly improve the user experience.",
        category: "feature",
        priority: "medium",
        status: "in_progress",
        assignedTo: 1,
        attachments: [],
        createdAt: new Date("2024-12-17T14:22:00Z"),
        updatedAt: new Date("2024-12-18T08:15:00Z"),
        resolvedAt: null
      },
      {
        id: this.currentSupportTicketId++,
        userId: 3,
        organizationId: 1,
        title: "Billing Discrepancy",
        description: "There seems to be an error in my last billing statement. I was charged for the Pro plan but I'm currently on the Basic plan.",
        category: "billing",
        priority: "high",
        status: "resolved",
        assignedTo: 1,
        attachments: [],
        createdAt: new Date("2024-12-16T11:45:00Z"),
        updatedAt: new Date("2024-12-17T16:30:00Z"),
        resolvedAt: new Date("2024-12-17T16:30:00Z")
      },
      {
        id: this.currentSupportTicketId++,
        userId: 1,
        organizationId: 1,
        title: "How to Export Project Data?",
        description: "I need to export all my project data for a client presentation. Could you guide me through the export process?",
        category: "support",
        priority: "low",
        status: "closed",
        assignedTo: null,
        attachments: [],
        createdAt: new Date("2024-12-15T13:20:00Z"),
        updatedAt: new Date("2024-12-15T17:45:00Z"),
        resolvedAt: new Date("2024-12-15T17:45:00Z")
      }
    ];

    sampleSupportTickets.forEach(ticket => this.supportTickets.set(ticket.id, ticket));

    // Create sample support ticket messages
    const sampleSupportTicketMessages: SupportTicketMessage[] = [
      // Messages for ticket 1 (Login Issues)
      {
        id: this.currentSupportTicketMessageId++,
        ticketId: 1,
        senderId: 1,
        senderType: "user",
        content: "I've tried clearing my browser cache and cookies, but the issue persists. This is affecting my ability to work on urgent projects.",
        attachments: [],
        isInternal: false,
        createdAt: new Date("2024-12-18T09:45:00Z")
      },
      {
        id: this.currentSupportTicketMessageId++,
        ticketId: 1,
        senderId: 1,
        senderType: "admin",
        content: "Hi there! I understand how frustrating this must be. Can you please tell me which browser you're using and if you see any specific error messages?",
        attachments: [],
        isInternal: false,
        createdAt: new Date("2024-12-18T10:30:00Z")
      },
      
      // Messages for ticket 2 (Dark Mode)
      {
        id: this.currentSupportTicketMessageId++,
        ticketId: 2,
        senderId: 1,
        senderType: "admin",
        content: "Thanks for the suggestion! Dark mode is actually on our roadmap for Q1 2025. We'll keep you updated on the progress.",
        attachments: [],
        isInternal: false,
        createdAt: new Date("2024-12-18T08:15:00Z")
      },
      {
        id: this.currentSupportTicketMessageId++,
        ticketId: 2,
        senderId: 2,
        senderType: "user",
        content: "That's great to hear! Looking forward to it. Any estimated timeline?",
        attachments: [],
        isInternal: false,
        createdAt: new Date("2024-12-18T08:45:00Z")
      },

      // Messages for ticket 3 (Billing)
      {
        id: this.currentSupportTicketMessageId++,
        ticketId: 3,
        senderId: 1,
        senderType: "admin",
        content: "I've reviewed your account and you're absolutely right. There was a billing system error that charged you incorrectly. I've processed a refund for the difference.",
        attachments: [],
        isInternal: false,
        createdAt: new Date("2024-12-17T16:30:00Z")
      },
      {
        id: this.currentSupportTicketMessageId++,
        ticketId: 3,
        senderId: 3,
        senderType: "user",
        content: "Thank you for the quick resolution! I really appreciate the excellent customer service.",
        attachments: [],
        isInternal: false,
        createdAt: new Date("2024-12-17T16:45:00Z")
      },

      // Messages for ticket 4 (Export Data)
      {
        id: this.currentSupportTicketMessageId++,
        ticketId: 4,
        senderId: 1,
        senderType: "admin",
        content: "You can export your project data by going to Projects → Select Project → Actions → Export. You can choose from PDF, Excel, or CSV formats.",
        attachments: [],
        isInternal: false,
        createdAt: new Date("2024-12-15T17:45:00Z")
      }
    ];

    sampleSupportTicketMessages.forEach(message => this.supportTicketMessages.set(message.id, message));

    // No sample messages - start with empty state for production
  }

  // Users
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  // Clients
  async getClients(organizationId?: number): Promise<Client[]> {
    const allClients = Array.from(this.clients.values());
    if (organizationId) {
      return allClients.filter(client => client.organizationId === organizationId);
    }
    return allClients;
  }

  async getClient(id: number, organizationId?: number): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    // If organization scope is provided, verify client belongs to that organization
    if (organizationId && client.organizationId !== organizationId) {
      return undefined;
    }
    
    return client;
  }

  async getClientByEmail(email: string, organizationId?: number): Promise<Client | undefined> {
    const allClients = Array.from(this.clients.values());
    if (organizationId) {
      return allClients.find(client => client.email === email && client.organizationId === organizationId);
    }
    return allClients.find(client => client.email === email);
  }

  async getClientWithProjects(id: number, organizationId?: number): Promise<ClientWithProjects | undefined> {
    const client = await this.getClient(id, organizationId);
    if (!client) return undefined;

    const clientProjects = Array.from(this.projects.values()).filter(p => p.clientId === id);
    return { ...client, projects: clientProjects };
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const client: Client = {
      ...insertClient,
      id: this.currentClientId++,
      joinedAt: new Date()
    };
    this.clients.set(client.id, client);
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient = { ...client, ...updateData };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Projects
  async getProjects(organizationId?: number): Promise<Project[]> {
    const allProjects = Array.from(this.projects.values());
    if (organizationId) {
      return allProjects.filter(project => project.organizationId === organizationId);
    }
    return allProjects;
  }

  async getProject(id: number, organizationId?: number): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    // If organization scope is provided, verify project belongs to that organization
    if (organizationId && project.organizationId !== organizationId) {
      return undefined;
    }
    
    return project;
  }

  async getProjectWithClient(id: number, organizationId?: number): Promise<ProjectWithClient | undefined> {
    const project = await this.getProject(id, organizationId);
    if (!project) return undefined;

    const client = this.clients.get(project.clientId);
    if (!client) return undefined;

    const projectMilestones = Array.from(this.milestones.values()).filter(m => m.projectId === id);
    const projectDocuments = Array.from(this.documents.values()).filter(d => d.projectId === id);

    return {
      ...project,
      client,
      milestones: projectMilestones,
      documents: projectDocuments
    };
  }

  async getProjectsByClient(clientId: number, organizationId?: number): Promise<Project[]> {
    const allProjects = Array.from(this.projects.values()).filter(p => p.clientId === clientId);
    if (organizationId) {
      return allProjects.filter(project => project.organizationId === organizationId);
    }
    return allProjects;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const project: Project = {
      ...insertProject,
      id: this.currentProjectId++,
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      // Ensure all required fields are properly initialized
      budgetUsed: insertProject.budgetUsed || "0.00",
      progress: insertProject.progress || 0,
      teamMembers: insertProject.teamMembers || [],
      tags: insertProject.tags || [],
      image: insertProject.image || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80&q=80"
    };
    this.projects.set(project.id, project);
    return project;
  }

  async updateProject(id: number, updateData: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, ...updateData, updatedAt: new Date() };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Project Team Members
  async getProjectTeamMembers(projectId: number): Promise<(ProjectTeamMember & { user: User })[]> {
    const teamMembers = Array.from(this.projectTeamMembers.values())
      .filter(ptm => ptm.projectId === projectId && ptm.isActive);
    
    return teamMembers.map(member => {
      const user = this.users.get(member.userId);
      return {
        ...member,
        user: user!
      };
    });
  }

  async addProjectTeamMember(insertMember: InsertProjectTeamMember): Promise<ProjectTeamMember> {
    const member: ProjectTeamMember = {
      ...insertMember,
      id: this.currentProjectTeamMemberId++,
      assignedAt: new Date()
    };
    this.projectTeamMembers.set(member.id, member);
    return member;
  }

  async updateProjectTeamMember(id: number, updateData: Partial<InsertProjectTeamMember>): Promise<ProjectTeamMember | undefined> {
    const member = this.projectTeamMembers.get(id);
    if (!member) return undefined;

    const updatedMember = { ...member, ...updateData };
    this.projectTeamMembers.set(id, updatedMember);
    return updatedMember;
  }

  async removeProjectTeamMember(id: number): Promise<boolean> {
    return this.projectTeamMembers.delete(id);
  }

  async getUserProjectRole(projectId: number, userId: number): Promise<ProjectTeamMember | undefined> {
    return Array.from(this.projectTeamMembers.values())
      .find(ptm => ptm.projectId === projectId && ptm.userId === userId && ptm.isActive);
  }

  async getProjectsForUser(userId: number, organizationId: number): Promise<ProjectWithTeamMembers[]> {
    // Get all projects for the organization
    const allProjects = Array.from(this.projects.values())
      .filter(p => p.organizationId === organizationId);
    
    // For each project, check if user has access
    const accessibleProjects: ProjectWithTeamMembers[] = [];
    
    for (const project of allProjects) {
      // Check if user is assigned to this project
      const userRole = await this.getUserProjectRole(project.id, userId);
      if (userRole || this.isUserAdmin(userId)) {
        const client = this.clients.get(project.clientId);
        const teamMembers = await this.getProjectTeamMembers(project.id);
        
        if (client) {
          const owner = this.users.get(project.ownerId);
          if (owner) {
            accessibleProjects.push({
              ...project,
              client,
              owner,
              teamMembers
            });
          }
        }
      }
    }
    
    return accessibleProjects;
  }

  async getProjectWithTeamMembers(id: number): Promise<ProjectWithTeamMembers | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const client = this.clients.get(project.clientId);
    if (!client) return undefined;

    const owner = this.users.get(project.ownerId);
    if (!owner) return undefined;

    const teamMembers = await this.getProjectTeamMembers(id);

    return {
      ...project,
      client,
      owner,
      teamMembers
    };
  }

  private isUserAdmin(userId: number): boolean {
    // Check if user has admin role in any organization
    return Array.from(this.userRoles.values())
      .some(role => role.userId === userId && role.role === 'admin');
  }

  // Milestones
  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return Array.from(this.milestones.values()).filter(m => m.projectId === projectId);
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    return this.milestones.get(id);
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const milestone: Milestone = {
      ...insertMilestone,
      id: this.currentMilestoneId++
    };
    this.milestones.set(milestone.id, milestone);
    return milestone;
  }

  async updateMilestone(id: number, updateData: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const milestone = this.milestones.get(id);
    if (!milestone) return undefined;

    const updatedMilestone = { ...milestone, ...updateData };
    this.milestones.set(id, updatedMilestone);
    return updatedMilestone;
  }

  async deleteMilestone(id: number): Promise<boolean> {
    return this.milestones.delete(id);
  }

  // Activities
  async getActivities(limit: number = 50): Promise<ActivityWithDetails[]> {
    const activities = Array.from(this.activities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return activities.map(activity => ({
      ...activity,
      project: activity.projectId ? this.projects.get(activity.projectId) : undefined,
      client: activity.clientId ? this.clients.get(activity.clientId) : undefined
    }));
  }

  async getActivitiesByProject(projectId: number): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(a => a.projectId === projectId);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const activity: Activity = {
      ...insertActivity,
      id: this.currentActivityId++,
      createdAt: new Date()
    };
    this.activities.set(activity.id, activity);
    return activity;
  }

  // Documents
  async getDocumentsByProject(projectId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(d => d.projectId === projectId);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const document: Document = {
      ...insertDocument,
      id: this.currentDocumentId++,
      uploadedAt: new Date()
    };
    this.documents.set(document.id, document);
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Messages
  async getMessagesByProject(projectId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.projectId === projectId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      ...insertMessage,
      id: this.currentMessageId++,
      sentAt: new Date()
    };
    this.messages.set(message.id, message);
    return message;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;

    message.isRead = true;
    this.messages.set(id, message);
    return true;
  }

  async getProjectMessages(projectId: number): Promise<Message[]> {
    const messages = Array.from(this.messages.values())
      .filter(m => m.projectId === projectId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    
    // Add sender information to messages
    return Promise.all(messages.map(async (message) => {
      const sender = await this.getUser(message.senderId) || await this.getClient(message.senderId);
      return {
        ...message,
        sender: {
          id: message.senderId,
          name: sender?.name || 'Unknown User',
          email: sender?.email
        }
      };
    }));
  }

  async markProjectMessagesAsRead(projectId: number, userId: number): Promise<boolean> {
    const messages = Array.from(this.messages.values())
      .filter(m => m.projectId === projectId && m.senderId !== userId && !m.isRead);
    
    messages.forEach(message => {
      message.isRead = true;
      this.messages.set(message.id, message);
    });
    
    return true;
  }

  async getConversations(userId: number): Promise<any[]> {
    // Get all projects where the user is involved
    const allProjects = Array.from(this.projects.values());
    const userProjects = allProjects.filter(project => {
      // Check if user is the client or a team member
      const client = this.clients.get(project.clientId);
      return client?.email === this.users.get(userId)?.email || 
             this.userRoles.has(userId); // Simplified team member check
    });

    const conversations = [];
    
    for (const project of userProjects) {
      const projectMessages = Array.from(this.messages.values())
        .filter(m => m.projectId === project.id)
        .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
      
      const lastMessage = projectMessages[0];
      const unreadCount = projectMessages.filter(m => 
        m.senderId !== userId && !m.isRead
      ).length;
      
      // Get participants
      const participants = await this.getProjectParticipants(project.id);
      
      conversations.push({
        projectId: project.id,
        projectName: project.title,
        lastMessage: lastMessage ? {
          ...lastMessage,
          sender: {
            id: lastMessage.senderId,
            name: (await this.getUser(lastMessage.senderId) || 
                   await this.getClient(lastMessage.senderId))?.name || 'Unknown'
          }
        } : undefined,
        unreadCount,
        participants
      });
    }
    
    return conversations.sort((a, b) => {
      const aTime = a.lastMessage?.sentAt.getTime() || 0;
      const bTime = b.lastMessage?.sentAt.getTime() || 0;
      return bTime - aTime;
    });
  }

  async getProjectParticipants(projectId: number): Promise<any[]> {
    const project = this.projects.get(projectId);
    if (!project) return [];
    
    const participants = [];
    
    // Add client
    const client = await this.getClient(project.clientId);
    if (client) {
      participants.push({
        id: client.id,
        name: client.name,
        type: 'client',
        email: client.email
      });
    }
    
    // Add team members (simplified - in real app, would check project assignments)
    const teamMembers = Array.from(this.users.values()).slice(0, 3); // Mock team members
    for (const member of teamMembers) {
      participants.push({
        id: member.id,
        name: member.name,
        type: 'team_member',
        email: member.email
      });
    }
    
    return participants;
  }

  // Direct Messages
  async createDirectMessage(insertDirectMessage: InsertDirectMessage): Promise<DirectMessage> {
    const directMessage: DirectMessage = {
      ...insertDirectMessage,
      id: this.currentDirectMessageId++,
      sentAt: new Date(),
      isRead: false
    };
    this.directMessages.set(directMessage.id, directMessage);
    return directMessage;
  }

  async getDirectMessages(clientId: number): Promise<DirectMessage[]> {
    const messages = Array.from(this.directMessages.values())
      .filter(m => m.clientId === clientId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    
    // Add sender information to messages
    return Promise.all(messages.map(async (message) => {
      const sender = await this.getUser(message.senderId) || await this.getClient(message.senderId);
      return {
        ...message,
        sender: {
          id: message.senderId,
          name: sender?.name || 'Unknown User',
          email: sender?.email
        }
      };
    }));
  }

  async markDirectMessagesAsRead(clientId: number, userId: number): Promise<boolean> {
    const messages = Array.from(this.directMessages.values())
      .filter(m => m.clientId === clientId && m.senderId !== userId && !m.isRead);
    
    messages.forEach(message => {
      message.isRead = true;
      this.directMessages.set(message.id, message);
    });
    
    return true;
  }

  async getClientConversations(): Promise<any[]> {
    const allClients = Array.from(this.clients.values());
    const conversations = [];
    
    for (const client of allClients) {
      const clientMessages = Array.from(this.directMessages.values())
        .filter(m => m.clientId === client.id)
        .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
      
      const lastMessage = clientMessages[0];
      const unreadCount = clientMessages.filter(m => 
        m.senderType === 'client' && !m.isRead
      ).length;
      
      conversations.push({
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientAvatar: client.avatar,
        lastMessage: lastMessage ? {
          ...lastMessage,
          sender: {
            id: lastMessage.senderId,
            name: (await this.getUser(lastMessage.senderId) || 
                   await this.getClient(lastMessage.senderId))?.name || 'Unknown'
          }
        } : undefined,
        unreadCount
      });
    }
    
    return conversations.sort((a, b) => {
      const aTime = a.lastMessage?.sentAt.getTime() || 0;
      const bTime = b.lastMessage?.sentAt.getTime() || 0;
      return bTime - aTime;
    });
  }

  // Team Direct Messages
  async createTeamDirectMessage(insertTeamDirectMessage: InsertTeamDirectMessage): Promise<TeamDirectMessage> {
    const teamDirectMessage: TeamDirectMessage = {
      ...insertTeamDirectMessage,
      id: this.currentTeamDirectMessageId++,
      sentAt: new Date(),
      isRead: false
    };
    this.teamDirectMessages.set(teamDirectMessage.id, teamDirectMessage);
    return teamDirectMessage;
  }

  async getTeamDirectMessages(userId: number): Promise<TeamDirectMessage[]> {
    const messages = Array.from(this.teamDirectMessages.values())
      .filter(m => m.receiverId === userId || m.senderId === userId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    
    // Add sender information to messages
    return Promise.all(messages.map(async (message) => {
      const sender = await this.getUser(message.senderId);
      return {
        ...message,
        sender: {
          id: message.senderId,
          name: sender?.name || 'Unknown User',
          email: sender?.email
        }
      };
    }));
  }

  async markTeamDirectMessagesAsRead(userId: number, currentUserId: number): Promise<boolean> {
    const messages = Array.from(this.teamDirectMessages.values())
      .filter(m => 
        (m.receiverId === userId || m.senderId === userId) && 
        m.senderId !== currentUserId && 
        !m.isRead
      );
    
    messages.forEach(message => {
      message.isRead = true;
      this.teamDirectMessages.set(message.id, message);
    });
    
    return true;
  }

  async getTeamMemberConversations(): Promise<any[]> {
    const allUsers = Array.from(this.users.values());
    const conversations = [];
    
    for (const user of allUsers) {
      const userMessages = Array.from(this.teamDirectMessages.values())
        .filter(m => m.receiverId === user.id || m.senderId === user.id)
        .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
      
      const lastMessage = userMessages[0];
      const unreadCount = userMessages.filter(m => 
        m.receiverId === user.id && m.senderType === 'admin' && !m.isRead
      ).length;
      
      conversations.push({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userAvatar: user.avatar,
        lastMessage: lastMessage ? {
          ...lastMessage,
          sender: {
            id: lastMessage.senderId,
            name: (await this.getUser(lastMessage.senderId))?.name || 'Unknown'
          }
        } : undefined,
        unreadCount
      });
    }
    
    return conversations.sort((a, b) => {
      const aTime = a.lastMessage?.sentAt.getTime() || 0;
      const bTime = b.lastMessage?.sentAt.getTime() || 0;
      return bTime - aTime;
    });
  }

  // Notifications
  async getNotifications(params: { userId: number; isRead?: boolean; limit?: number }): Promise<Notification[]> {
    const { userId, isRead, limit = 50 } = params;
    
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId);
    
    if (isRead !== undefined) {
      notifications = notifications.filter(n => n.isRead === isRead);
    }
    
    return notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      ...insertNotification,
      id: this.currentNotificationId++,
      createdAt: new Date()
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;

    notification.isRead = true;
    notification.readAt = new Date();
    this.notifications.set(id, notification);
    return notification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<number> {
    let count = 0;
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId && !notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        this.notifications.set(id, notification);
        count++;
      }
    }
    return count;
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead)
      .length;
  }

  // Team Management
  async getTeamMembers(organizationId: number): Promise<(User & { role: string; status: string })[]> {
    // Get all user roles for this organization
    const orgUserRoles = Array.from(this.userRoles.values()).filter(r => r.organizationId === organizationId);
    console.log('🔍 Found user roles for org', organizationId, ':', orgUserRoles.length);
    
    // Get users who have roles in this organization, plus legacy users with organizationId
    const legacyOrgUsers = Array.from(this.users.values()).filter(u => u.organizationId === organizationId);
    const roleBasedUsers = orgUserRoles.map(role => this.users.get(role.userId)).filter(u => u !== undefined);
    
    console.log('🔍 Legacy org users:', legacyOrgUsers.length, 'Role-based users:', roleBasedUsers.length);
    
    // Combine and deduplicate users
    const allUsers = [...legacyOrgUsers, ...roleBasedUsers];
    const uniqueUsers = allUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    );
    
    console.log('🔍 Total unique users for org:', uniqueUsers.length);
    
    return uniqueUsers.map(user => {
      const userRole = Array.from(this.userRoles.values()).find(r => r.userId === user.id && r.organizationId === organizationId);
      
      return {
        ...user,
        role: userRole?.role || "team_member",
        status: user.isActive ? "active" : "suspended"
      };
    });
  }

  async getTeamInvitations(organizationId: number): Promise<TeamInvitation[]> {
    return Array.from(this.teamInvitations.values())
      .filter(inv => inv.organizationId === organizationId && !inv.acceptedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createTeamInvitation(insertInvitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const invitation: TeamInvitation = {
      ...insertInvitation,
      id: this.currentTeamInvitationId++,
      token: `invitation-token-${Date.now()}`,
      createdAt: new Date()
    };
    this.teamInvitations.set(invitation.id, invitation);
    return invitation;
  }

  async resendTeamInvitation(id: number): Promise<TeamInvitation | undefined> {
    const invitation = this.teamInvitations.get(id);
    if (!invitation) return undefined;

    // Update expiration date
    invitation.expiresAt = new Date(Date.now() + 7 * 86400000); // 7 days from now
    this.teamInvitations.set(id, invitation);
    
    return invitation;
  }

  async cancelTeamInvitation(id: number): Promise<boolean> {
    return this.teamInvitations.delete(id);
  }

  async updateUserRole(userId: number, organizationId: number, role: string): Promise<UserRole | undefined> {
    const existingRole = Array.from(this.userRoles.values()).find(r => r.userId === userId && r.organizationId === organizationId);
    
    if (existingRole) {
      existingRole.role = role;
      this.userRoles.set(existingRole.id, existingRole);
      return existingRole;
    }
    
    // Create new role if doesn't exist
    const newRole: UserRole = {
      id: this.currentUserRoleId++,
      userId,
      organizationId,
      role,
      permissions: role === "admin" ? ["*"] : ["projects:read", "clients:read"],
      createdAt: new Date()
    };
    
    this.userRoles.set(newRole.id, newRole);
    return newRole;
  }

  async suspendUser(userId: number, suspend: boolean): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.isActive = !suspend;
    user.status = suspend ? 'suspended' : 'active';
    this.users.set(userId, user);
    return true;
  }

  async updateUserStatus(userId: number, status: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.status = status;
    user.isActive = status === 'active';
    this.users.set(userId, user);
    return true;
  }

  async removeUserFromOrganization(userId: number, organizationId: number): Promise<boolean> {
    // Remove user role from organization
    const userRole = Array.from(this.userRoles.values()).find(r => r.userId === userId && r.organizationId === organizationId);
    if (userRole) {
      this.userRoles.delete(userRole.id);
      console.log('🔍 Removed user role:', userRole);
    }
    
    // Note: We don't delete the user entirely, just remove them from this organization
    // The user can still exist in other organizations or have their own account
    return true;
  }

  // Debug method to get all user roles
  async getAllUserRoles(): Promise<UserRole[]> {
    return Array.from(this.userRoles.values());
  }

  // Enhanced Invitation System
  async validateInvitationToken(token: string): Promise<UserInvitation | null> {
    const invitation = Array.from(this.userInvitations.values()).find(inv => inv.token === token);
    
    if (!invitation) return null;
    
    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await this.markInvitationAsExpired(invitation.id);
      return null;
    }
    
    // Check if already used
    if (invitation.status !== 'pending') {
      return null;
    }
    
    return invitation;
  }

  async createUserInvitation(invitation: InsertUserInvitation): Promise<UserInvitation> {
    const newInvitation: UserInvitation = {
      ...invitation,
      id: this.currentUserInvitationId++,
      token: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.userInvitations.set(newInvitation.id, newInvitation);
    
    // Log invitation creation
    await this.logInvitationAction('sent', newInvitation.id, invitation.invitedBy);
    
    return newInvitation;
  }

  async acceptInvitation(token: string, userId: number, metadata?: { ipAddress?: string; userAgent?: string }): Promise<UserInvitation | null> {
    const invitation = await this.validateInvitationToken(token);
    
    if (!invitation) return null;
    
    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = userId;
    invitation.usedAt = new Date();
    invitation.updatedAt = new Date();
    
    if (metadata) {
      invitation.ipAddress = metadata.ipAddress;
      invitation.userAgent = metadata.userAgent;
    }
    
    this.userInvitations.set(invitation.id, invitation);
    
    // Log invitation acceptance
    await this.logInvitationAction('accepted', invitation.id, userId, metadata);
    
    // Create role assignment record
    await this.createRoleAssignment({
      userId,
      assignedRole: invitation.role,
      assignedBy: invitation.invitedBy,
      projectId: invitation.projectId,
      reason: `Invitation acceptance - ${invitation.invitationType}`,
    });
    
    return invitation;
  }

  async revokeInvitation(invitationId: number, revokedBy: number, reason?: string): Promise<boolean> {
    const invitation = this.userInvitations.get(invitationId);
    
    if (!invitation || invitation.status !== 'pending') return false;
    
    invitation.status = 'revoked';
    invitation.revokedBy = revokedBy;
    invitation.revokedAt = new Date();
    invitation.updatedAt = new Date();
    
    this.userInvitations.set(invitationId, invitation);
    
    // Log revocation
    await this.logInvitationAction('revoked', invitationId, revokedBy, { reason });
    
    return true;
  }

  async getInvitationsByEmail(email: string): Promise<UserInvitation[]> {
    return Array.from(this.userInvitations.values())
      .filter(inv => inv.email === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getInvitationById(id: number): Promise<UserInvitation | null> {
    return this.userInvitations.get(id) || null;
  }

  async markInvitationAsExpired(id: number): Promise<boolean> {
    const invitation = this.userInvitations.get(id);
    
    if (!invitation) return false;
    
    invitation.status = 'expired';
    invitation.updatedAt = new Date();
    
    this.userInvitations.set(id, invitation);
    
    // Log expiration
    await this.logInvitationAction('expired', id);
    
    return true;
  }

  // Audit Trail
  async logInvitationAction(action: string, invitationId: number, performedBy?: number, metadata?: any): Promise<InvitationAudit> {
    const auditEntry: InvitationAudit = {
      id: this.currentInvitationAuditId++,
      invitationId,
      action,
      performedBy,
      metadata: metadata || {},
      createdAt: new Date(),
    };
    
    this.invitationAudits.set(auditEntry.id, auditEntry);
    return auditEntry;
  }

  async createRoleAssignment(assignment: InsertRoleAssignment): Promise<RoleAssignment> {
    const roleAssignment: RoleAssignment = {
      ...assignment,
      id: this.currentRoleAssignmentId++,
      effectiveFrom: assignment.effectiveFrom || new Date(),
      createdAt: new Date(),
    };
    
    this.roleAssignments.set(roleAssignment.id, roleAssignment);
    return roleAssignment;
  }

  async getRoleAssignmentHistory(userId: number): Promise<RoleAssignment[]> {
    return Array.from(this.roleAssignments.values())
      .filter(assignment => assignment.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Onboarding Forms
  async getOnboardingForms(organizationId: number): Promise<OnboardingForm[]> {
    return Array.from(this.onboardingForms.values())
      .filter(form => form.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getOnboardingForm(id: number): Promise<OnboardingForm | undefined> {
    return this.onboardingForms.get(id);
  }

  async getOnboardingFormByProject(projectId: number): Promise<OnboardingForm | undefined> {
    // Get the project first to find the assigned onboarding form
    const project = this.projects.get(projectId);
    if (!project || !project.onboardingFormId) {
      return undefined;
    }
    
    // Return the assigned onboarding form
    const form = this.onboardingForms.get(project.onboardingFormId);
    return form && form.isActive ? form : undefined;
  }

  async getOnboardingFormWithSubmissions(id: number): Promise<FormWithSubmissions | undefined> {
    const form = this.onboardingForms.get(id);
    if (!form) return undefined;

    const submissions = Array.from(this.formSubmissions.values())
      .filter(submission => submission.formId === id)
      .map(submission => {
        const client = this.clients.get(submission.clientId);
        return { ...submission, client: client! };
      });

    const project = form.projectId ? this.projects.get(form.projectId) : undefined;

    return { ...form, submissions, project };
  }

  async createOnboardingForm(insertForm: InsertOnboardingForm): Promise<OnboardingForm> {
    const form: OnboardingForm = {
      ...insertForm,
      id: this.currentOnboardingFormId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onboardingForms.set(form.id, form);
    return form;
  }

  async updateOnboardingForm(id: number, updateData: Partial<InsertOnboardingForm>): Promise<OnboardingForm | undefined> {
    const form = this.onboardingForms.get(id);
    if (!form) return undefined;

    const updatedForm = { ...form, ...updateData, updatedAt: new Date() };
    this.onboardingForms.set(id, updatedForm);
    return updatedForm;
  }

  async deleteOnboardingForm(id: number): Promise<boolean> {
    return this.onboardingForms.delete(id);
  }

  // Form Submissions
  async getFormSubmissions(formId: number): Promise<FormSubmission[]> {
    return Array.from(this.formSubmissions.values())
      .filter(submission => submission.formId === formId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    return this.formSubmissions.get(id);
  }

  async getFormSubmissionsByProjectAndClient(projectId: number, clientId: number): Promise<FormSubmission[]> {
    return Array.from(this.formSubmissions.values())
      .filter(submission => submission.projectId === projectId && submission.clientId === clientId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async getFormSubmissionsByProject(projectId: number): Promise<FormSubmission[]> {
    return Array.from(this.formSubmissions.values())
      .filter(submission => submission.projectId === projectId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]> {
    // Get all forms for this organization first
    const orgForms = Array.from(this.onboardingForms.values())
      .filter(form => form.organizationId === organizationId);
    const formIds = orgForms.map(form => form.id);
    
    return Array.from(this.formSubmissions.values())
      .filter(submission => formIds.includes(submission.formId))
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async createFormSubmission(insertSubmission: InsertFormSubmission): Promise<FormSubmission> {
    const submission: FormSubmission = {
      ...insertSubmission,
      id: this.currentFormSubmissionId++,
      submittedAt: new Date()
    };
    this.formSubmissions.set(submission.id, submission);
    return submission;
  }

  async updateFormSubmission(id: number, updateData: Partial<InsertFormSubmission>): Promise<FormSubmission | undefined> {
    const submission = this.formSubmissions.get(id);
    if (!submission) return undefined;

    const updatedSubmission = { ...submission, ...updateData };
    this.formSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  async markSubmissionAsReviewed(id: number, reviewedBy: number): Promise<FormSubmission | undefined> {
    const submission = this.formSubmissions.get(id);
    if (!submission) return undefined;

    submission.reviewedBy = reviewedBy;
    submission.reviewedAt = new Date();
    this.formSubmissions.set(id, submission);
    return submission;
  }

  // Project Comments
  async getProjectComments(projectId: number): Promise<CommentWithAuthor[]> {
    const comments = Array.from(this.projectComments.values())
      .filter(comment => comment.projectId === projectId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Build threaded structure
    const commentMap = new Map<number, CommentWithAuthor>();
    const rootComments: CommentWithAuthor[] = [];

    // First pass: create all comments with authors
    for (const comment of comments) {
      const author = this.users.get(comment.authorId);
      if (!author) continue;

      const commentWithAuthor: CommentWithAuthor = {
        ...comment,
        author,
        replies: []
      };
      
      commentMap.set(comment.id, commentWithAuthor);
      
      if (!comment.parentId) {
        rootComments.push(commentWithAuthor);
      }
    }

    // Second pass: build reply threads
    for (const comment of comments) {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        const child = commentMap.get(comment.id);
        if (parent && child) {
          parent.replies!.push(child);
        }
      }
    }

    return rootComments;
  }

  async getComment(id: number): Promise<ProjectComment | undefined> {
    return this.projectComments.get(id);
  }

  async getCommentThread(parentId: number): Promise<CommentWithAuthor[]> {
    const comments = Array.from(this.projectComments.values())
      .filter(comment => comment.parentId === parentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return comments.map(comment => {
      const author = this.users.get(comment.authorId);
      return {
        ...comment,
        author: author!,
        replies: []
      };
    });
  }

  async createComment(insertComment: InsertProjectComment): Promise<ProjectComment> {
    const comment: ProjectComment = {
      ...insertComment,
      id: this.currentProjectCommentId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projectComments.set(comment.id, comment);

    // Create notifications for mentions
    if (comment.mentions && comment.mentions.length > 0) {
      for (const mentionedUserId of comment.mentions) {
        const author = this.users.get(comment.authorId);
        const project = this.projects.get(comment.projectId);
        
        if (author && project) {
          const notificationData = {
            userId: mentionedUserId,
            organizationId: 1, // Default organization
            type: "mention",
            title: "You were mentioned in a comment",
            message: `${author.name} mentioned you in ${project.title}`,
            data: { commentId: comment.id, projectId: comment.projectId },
            isRead: false,
            actionUrl: `/projects/${comment.projectId}#comment-${comment.id}`
          };
          
          await this.createNotification(notificationData);
        }
      }
    }

    return comment;
  }

  async updateComment(id: number, updateData: Partial<InsertProjectComment>): Promise<ProjectComment | undefined> {
    const comment = this.projectComments.get(id);
    if (!comment) return undefined;

    const updatedComment = { ...comment, ...updateData, updatedAt: new Date() };
    this.projectComments.set(id, updatedComment);
    return updatedComment;
  }

  async deleteComment(id: number): Promise<boolean> {
    // Also delete all replies
    const replies = Array.from(this.projectComments.values()).filter(c => c.parentId === id);
    for (const reply of replies) {
      this.projectComments.delete(reply.id);
    }
    
    return this.projectComments.delete(id);
  }

  async resolveComment(id: number, resolvedBy: number): Promise<ProjectComment | undefined> {
    const comment = this.projectComments.get(id);
    if (!comment) return undefined;

    comment.status = "resolved";
    comment.resolvedBy = resolvedBy;
    comment.resolvedAt = new Date();
    comment.updatedAt = new Date();
    
    this.projectComments.set(id, comment);
    return comment;
  }

  // Stats
  async getStats(): Promise<{
    activeProjects: number;
    totalClients: number;
    monthlyRevenue: number;
    hoursThisMonth: number;
  }> {
    const activeProjects = Array.from(this.projects.values()).filter(p => p.status === "active").length;
    const totalClients = this.clients.size;
    
    // Calculate monthly revenue from recent activities
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlyRevenue = Array.from(this.activities.values())
      .filter(a => a.type === "payment_received" && a.createdAt >= thisMonth)
      .reduce((sum, a) => sum + (a.metadata?.amount || 0), 0);

    return {
      activeProjects,
      totalClients,
      monthlyRevenue,
      hoursThisMonth: 342
    };
  }

  // Asset Management Methods
  async getAssets(organizationId: number, projectId?: number, folder?: string): Promise<Asset[]> {
    const assets = Array.from(this.assets.values()).filter(asset => {
      if (asset.organizationId !== organizationId) return false;
      if (projectId && asset.projectId !== projectId) return false;
      if (folder && asset.folder !== folder) return false;
      return true;
    });
    
    return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const id = this.currentAssetId++;
    const newAsset: Asset = {
      id,
      ...asset,
      createdAt: new Date(),
    };
    this.assets.set(id, newAsset);
    return newAsset;
  }

  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const existing = this.assets.get(id);
    if (!existing) return undefined;

    const updated: Asset = { ...existing, ...asset };
    this.assets.set(id, updated);
    return updated;
  }

  async deleteAsset(id: number): Promise<boolean> {
    return this.assets.delete(id);
  }

  async getAssetsByTags(organizationId: number, tags: string[]): Promise<Asset[]> {
    const assets = Array.from(this.assets.values()).filter(asset => {
      if (asset.organizationId !== organizationId) return false;
      return tags.some(tag => asset.tags.includes(tag));
    });
    
    return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAssetsByType(organizationId: number, type: string): Promise<Asset[]> {
    const assets = Array.from(this.assets.values()).filter(asset => {
      return asset.organizationId === organizationId && asset.type === type;
    });
    
    return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getFolders(organizationId: number): Promise<string[]> {
    const folders = new Set<string>();
    
    Array.from(this.assets.values())
      .filter(asset => asset.organizationId === organizationId)
      .forEach(asset => folders.add(asset.folder));
    
    return Array.from(folders).sort();
  }

  // Project Tasks Management Methods
  async getProjectTasks(projectId: number): Promise<TaskWithAssignee[]> {
    const tasks = Array.from(this.projectTasks.values())
      .filter(task => task.projectId === projectId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    return tasks.map(task => {
      const assignee = task.assignedTo ? this.users.get(task.assignedTo) : undefined;
      const project = this.projects.get(task.projectId);
      return { ...task, assignee, project };
    });
  }

  async getProjectTask(id: number): Promise<ProjectTask | undefined> {
    return this.projectTasks.get(id);
  }

  async createProjectTask(insertTask: InsertProjectTask): Promise<ProjectTask> {
    const task: ProjectTask = {
      id: this.currentProjectTaskId++,
      projectId: insertTask.projectId,
      title: insertTask.title,
      description: insertTask.description || null,
      status: insertTask.status || "todo",
      priority: insertTask.priority || "medium",
      assignedTo: insertTask.assignedTo || null,
      estimatedHours: insertTask.estimatedHours || null,
      actualHours: insertTask.actualHours || null,
      dueDate: insertTask.dueDate || null,
      completedAt: insertTask.completedAt || null,
      position: insertTask.position || 0,
      labels: insertTask.labels || [],
      checklist: insertTask.checklist || [],
      createdBy: insertTask.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projectTasks.set(task.id, task);
    return task;
  }

  async updateProjectTask(id: number, updateData: Partial<InsertProjectTask>): Promise<ProjectTask | undefined> {
    const task = this.projectTasks.get(id);
    if (!task) return undefined;

    const updatedTask: ProjectTask = {
      ...task,
      ...updateData,
      updatedAt: new Date()
    };
    this.projectTasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteProjectTask(id: number): Promise<boolean> {
    return this.projectTasks.delete(id);
  }

  async updateTaskStatus(id: number, status: string): Promise<ProjectTask | undefined> {
    const task = this.projectTasks.get(id);
    if (!task) return undefined;

    const updatedTask = {
      ...task,
      status,
      updatedAt: new Date(),
      completedAt: status === 'done' && !task.completedAt ? new Date() : 
                   status !== 'done' ? null : task.completedAt
    };

    this.projectTasks.set(id, updatedTask);
    return updatedTask;
  }

  async updateTaskPosition(id: number, position: number): Promise<ProjectTask | undefined> {
    const task = this.projectTasks.get(id);
    if (!task) return undefined;

    const updatedTask = {
      ...task,
      position,
      updatedAt: new Date()
    };
    
    this.projectTasks.set(id, updatedTask);
    return updatedTask;
  }

  async getTasksByStatus(projectId: number, status: string): Promise<TaskWithAssignee[]> {
    const tasks = Array.from(this.projectTasks.values())
      .filter(task => task.projectId === projectId && task.status === status)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    return tasks.map(task => {
      const assignee = task.assignedTo ? this.users.get(task.assignedTo) : undefined;
      const project = this.projects.get(task.projectId);
      return { ...task, assignee, project };
    });
  }

  // Organization Management Methods
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  // Billing and Subscription Management Methods
  async updateOrganizationBilling(
    organizationId: number, 
    billingData: {
      plan?: string;
      subscriptionStatus?: string;
    }
  ): Promise<Organization | undefined> {
    const organization = this.organizations.get(organizationId);
    if (!organization) return undefined;

    const updated: Organization = {
      ...organization,
      ...billingData,
      updatedAt: new Date()
    };

    this.organizations.set(organizationId, updated);
    return updated;
  }

  async getOrganizationWithBilling(organizationId: number): Promise<OrganizationWithBilling | undefined> {
    const organization = this.organizations.get(organizationId);
    if (!organization) return undefined;

    // Get users with roles for this organization
    const orgUsers = Array.from(this.users.values())
      .filter(user => {
        // Check if user has membership in this organization
        return Array.from(this.userRoles.values())
          .some(role => role.userId === user.id && role.organizationId === organizationId);
      })
      .map(user => {
        const roles = Array.from(this.userRoles.values())
          .filter(role => role.userId === user.id && role.organizationId === organizationId);
        return { ...user, organization, roles };
      });

    // Get projects for this organization
    const orgProjects = Array.from(this.projects.values())
      .filter(project => {
        const client = this.clients.get(project.clientId);
        if (!client) return false;
        // Check if the client's creator belongs to this organization
        const creator = this.users.get(client.createdBy);
        if (!creator) return false;
        return Array.from(this.userRoles.values())
          .some(role => role.userId === creator.id && role.organizationId === organizationId);
      });

    // Calculate current usage
    const usage = {
      projects: orgProjects.length,
      teamMembers: orgUsers.length,
      storage: this.calculateStorageUsage(organizationId),
    };

    const plan = organization.plan || 'solo';
    const currentPlan = BILLING_PLANS[plan as keyof typeof BILLING_PLANS] || BILLING_PLANS.solo;

    return {
      ...organization,
      users: orgUsers,
      projects: orgProjects,
      currentPlan,
      subscriptionPlan: organization.plan, // Add subscriptionPlan for frontend compatibility
      usage,
    };
  }

  private calculateStorageUsage(organizationId: number): number {
    // Calculate total storage used by organization's assets
    const orgAssets = Array.from(this.assets.values())
      .filter(asset => asset.organizationId === organizationId);
    
    return orgAssets.reduce((total, asset) => total + (asset.size || 0), 0);
  }


  async getOrganizationUsage(organizationId: number): Promise<{ projects: number; collaborators: number; storage: number }> {
    const orgUsers = Array.from(this.users.values())
      .filter(user => {
        // Check if user has membership in this organization
        return Array.from(this.userRoles.values())
          .some(role => role.userId === user.id && role.organizationId === organizationId);
      });

    const orgProjects = Array.from(this.projects.values())
      .filter(project => {
        const client = this.clients.get(project.clientId);
        if (!client) return false;
        // Check if the client's creator belongs to this organization
        const creator = this.users.get(client.createdBy);
        if (!creator) return false;
        return Array.from(this.userRoles.values())
          .some(role => role.userId === creator.id && role.organizationId === organizationId);
      });

    return {
      projects: orgProjects.length,
      collaborators: orgUsers.length,
      storage: this.calculateStorageUsage(organizationId),
    };
  }

  async updateOrganizationPlan(organizationId: number, plan: string): Promise<any> {
    const organization = this.organizations.get(organizationId);
    if (!organization) return undefined;

    const updated = { ...organization, plan };
    this.organizations.set(organizationId, updated);
    
    return this.getOrganizationWithBilling(organizationId);
  }

  // Support Ticket Management Methods
  async getSupportTickets(organizationId: number, userId?: number): Promise<TicketWithMessages[]> {
    const tickets = Array.from(this.supportTickets.values())
      .filter(ticket => {
        if (ticket.organizationId !== organizationId) return false;
        if (userId && ticket.userId !== userId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return tickets.map(ticket => {
      const messages = Array.from(this.supportTicketMessages.values())
        .filter(msg => msg.ticketId === ticket.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(msg => ({
          ...msg,
          sender: this.users.get(msg.senderId)!
        }));

      const assignee = ticket.assignedTo ? this.users.get(ticket.assignedTo) : undefined;
      const user = this.users.get(ticket.userId)!;

      return { ...ticket, messages, assignee, user };
    });
  }

  async getSupportTicket(id: number): Promise<TicketWithMessages | undefined> {
    const ticket = this.supportTickets.get(id);
    if (!ticket) return undefined;

    const messages = Array.from(this.supportTicketMessages.values())
      .filter(msg => msg.ticketId === ticket.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(msg => ({
        ...msg,
        sender: this.users.get(msg.senderId)!
      }));

    const assignee = ticket.assignedTo ? this.users.get(ticket.assignedTo) : undefined;
    const user = this.users.get(ticket.userId)!;

    return { ...ticket, messages, assignee, user };
  }

  async createSupportTicket(insertTicket: InsertSupportTicket): Promise<SupportTicket> {
    const ticket: SupportTicket = {
      id: this.currentSupportTicketId++,
      organizationId: insertTicket.organizationId,
      userId: insertTicket.userId,
      title: insertTicket.title,
      description: insertTicket.description,
      category: insertTicket.category,
      priority: insertTicket.priority || "medium",
      status: insertTicket.status || "open",
      assignedTo: insertTicket.assignedTo || null,
      attachments: insertTicket.attachments || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: insertTicket.resolvedAt || null
    };

    this.supportTickets.set(ticket.id, ticket);
    return ticket;
  }

  async updateSupportTicket(id: number, updateData: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const ticket = this.supportTickets.get(id);
    if (!ticket) return undefined;

    const updatedTicket: SupportTicket = {
      ...ticket,
      ...updateData,
      updatedAt: new Date(),
      resolvedAt: updateData.status === 'resolved' && !ticket.resolvedAt ? new Date() : 
                 updateData.status !== 'resolved' ? null : ticket.resolvedAt
    };

    this.supportTickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async deleteSupportTicket(id: number): Promise<boolean> {
    // Also delete all messages for this ticket
    Array.from(this.supportTicketMessages.values())
      .filter(msg => msg.ticketId === id)
      .forEach(msg => this.supportTicketMessages.delete(msg.id));

    return this.supportTickets.delete(id);
  }

  async createSupportTicketMessage(insertMessage: InsertSupportTicketMessage): Promise<SupportTicketMessage> {
    const message: SupportTicketMessage = {
      id: this.currentSupportTicketMessageId++,
      ticketId: insertMessage.ticketId,
      senderId: insertMessage.senderId,
      senderType: insertMessage.senderType,
      content: insertMessage.content,
      attachments: insertMessage.attachments || [],
      isInternal: insertMessage.isInternal || false,
      createdAt: new Date()
    };

    this.supportTicketMessages.set(message.id, message);

    // Update ticket's updatedAt timestamp
    const ticket = this.supportTickets.get(insertMessage.ticketId);
    if (ticket) {
      ticket.updatedAt = new Date();
      this.supportTickets.set(ticket.id, ticket);
    }

    return message;
  }

  async getSupportTicketMessages(ticketId: number): Promise<(SupportTicketMessage & { sender: User })[]> {
    return Array.from(this.supportTicketMessages.values())
      .filter(msg => msg.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(msg => ({
        ...msg,
        sender: this.users.get(msg.senderId)!
      }));
  }

  async getTicketsByStatus(status: string): Promise<SupportTicket[]> {
    return Array.from(this.supportTickets.values())
      .filter(ticket => ticket.status === status)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getTicketsByCategory(category: string): Promise<SupportTicket[]> {
    return Array.from(this.supportTickets.values())
      .filter(ticket => ticket.category === category)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async updateUser(id: number, data: any): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      ...data,
      updatedAt: new Date()
    };

    this.users.set(id, updated);
    return updated;
  }

  async getOrganizationWithUsage(id: number): Promise<OrganizationWithUsage | undefined> {
    const organization = this.organizations.get(id);
    if (!organization) return undefined;

    // Get users for this organization through memberships
    const orgUsers = Array.from(this.users.values())
      .filter(user => {
        // Check if user has membership in this organization
        return Array.from(this.userRoles.values())
          .some(role => role.userId === user.id && role.organizationId === id);
      });

    // Get projects for this organization
    const orgProjects = Array.from(this.projects.values())
      .filter(project => {
        const client = this.clients.get(project.clientId);
        return client?.organizationId === id;
      });

    // Calculate current usage
    const usage = {
      projects: orgProjects.length,
      collaborators: orgUsers.length,
      storage: this.calculateStorageUsage(id),
    };

    return {
      ...organization,
      usage
    };
  }
}
// Import Supabase storage for production
import { SupabaseStorage } from './supabase-storage';

// CRITICAL: Force Supabase storage for ALL environments to prevent data loss
// Previously using MemStorage in development was causing complete data loss
export const storage = new SupabaseStorage();
