# FunnelHQ 360 V3 - Complete Organization-Centric Platform

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 What's New in V3

FunnelHQ 360 V3 represents a complete architectural transformation from a user-centric to an **organization-centric platform**. This major update solves critical issues with team collaboration, data isolation, and billing management.

### 🎯 Key Problems Solved

- **❌ Before:** Pro Trial users blocked from team collaboration features
- **❌ Before:** Data scattered across individual user accounts  
- **❌ Before:** Inconsistent billing and plan enforcement
- **❌ Before:** Manual organization setup and management

### ✅ V3 Solutions

- **✅ Auto-organization creation** on every signup
- **✅ Complete data isolation** per organization
- **✅ Organization-level billing** and plan enforcement
- **✅ Role-based access control** (Admin, Team Member, Client)
- **✅ Enterprise-grade export/recovery** system
- **✅ Real-time usage monitoring** and plan compliance

---

## 📋 Major Feature Updates

### 🏢 **1. Auto-Organization System**
Every user signup automatically creates an organization with the user as admin. No more manual setup required.

```
User Signup → Auto-Create Organization → Assign Admin Role → Pro Trial Plan
```

### 🔐 **2. Advanced Security & Access Control**
Three-tier security system with granular permissions:

- **Organization Admins:** Full access to all organization data
- **Team Members:** Project-specific access with task management
- **Clients:** Limited portal access to assigned projects only

### 📊 **3. Usage Monitoring & Plan Enforcement**
Real-time tracking and automatic enforcement of plan limits:

- **Projects:** Tracked and limited per plan
- **Team Members:** Monitored with collaboration limits  
- **Storage:** File and document usage tracking
- **Violations:** Automatic blocking with upgrade recommendations

### 💾 **4. Complete Data Management**
Enterprise-level backup and recovery capabilities:

- **Export Formats:** JSON, CSV, ZIP archives
- **Recovery Options:** Full restore, partial restore, merge mode
- **Scheduling:** Automated backups and export jobs
- **Validation:** File integrity checking before recovery

---

## 🏗️ Architecture Overview

### Database Schema Changes

#### New Tables Added:
- `organizations` - Organization details and billing
- `organization_memberships` - User-organization relationships
- `organization_invitations` - Pending organization invites
- `organization_usage_tracking` - Historical usage analytics
- `plan_limit_violations` - Limit breach tracking
- `usage_alerts` - System notifications
- `organization_export_jobs` - Data export management
- `organization_recovery_jobs` - Data recovery operations

#### Modified Tables:
- `clients` - Added required `organization_id` field
- `projects` - Made `organization_id` required
- `users` - Removed billing fields (now organization-level)

### API Routes Structure

```
/api/
├── auth-middleware.ts           # Organization membership validation
├── client-management.ts         # Admin client management
├── client-portal-routes.ts      # Client portal endpoints
├── client-portal-middleware.ts  # Client access control
├── team-management-routes.ts    # Team member management
├── team-member-portal-routes.ts # Team member endpoints
├── team-member-middleware.ts    # Team member access control
├── organization-export.ts       # Data export system
├── organization-recovery.ts     # Data recovery system
├── usage-monitoring.ts          # Real-time usage tracking
├── plan-enforcement.ts          # Automated plan limits
└── clerk-webhooks.ts           # Auto-organization creation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase account
- Clerk authentication setup

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/naveends798/FunnelHQ-360-V3.git
cd FunnelHQ-360-V3
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment setup:**
```bash
cp .env.example .env
# Configure your environment variables
```

4. **Database setup:**
```bash
npm run db:push
npm run db:seed
```

5. **Start development server:**
```bash
npm run dev
```

### Environment Variables

```env
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Database
DATABASE_URL=postgresql://...
```

---

## 🔧 Key Features Deep Dive

### Auto-Organization Creation

When a user signs up through Clerk, the webhook automatically:
1. Creates a new organization with auto-generated name
2. Assigns the user as organization admin
3. Sets up Pro Trial plan with full features
4. Creates organization membership record

### Role-Based Portal System

#### Admin Portal
- Complete organization management
- Team member and client management
- Billing and plan management
- Usage monitoring and analytics
- Data export and recovery

#### Team Member Portal  
- Project-specific task management
- Time tracking and collaboration
- File uploads and comments
- Limited to assigned projects only

#### Client Portal
- Project progress viewing
- Deliverable reviews and approvals
- Feedback and communication
- Read-only access to assigned projects

### Plan Enforcement System

Automatic enforcement before resource creation:

```typescript
// Example: Project creation with plan enforcement
app.post("/api/projects", 
  authenticateUser, 
  requireOrganizationAccess(['create_projects']), 
  enforcePlanLimits('projects'),  // 🔒 Plan check here
  async (req, res) => {
    // Project creation logic
  }
);
```

Plans supported:
- **Solo:** 3 projects, 0 team members, 5GB storage
- **Pro Trial:** Unlimited projects, unlimited team members, 100GB storage  
- **Pro:** Unlimited projects, unlimited team members, 100GB storage

---

## 📊 Usage Monitoring

### Real-Time Metrics
- Active projects and team members
- Storage usage (documents, avatars, files)
- API requests and login activity
- Plan compliance status

### Historical Analytics
- Usage trends over time
- Period-over-period comparisons
- Violation tracking and resolution
- Alert and notification history

### API Endpoints

```typescript
GET  /api/usage/usage              # Current usage metrics
GET  /api/usage/history           # Historical usage data
GET  /api/usage/violations        # Active limit violations
GET  /api/usage/alerts            # Usage alerts and notifications
POST /api/usage/recalculate       # Force usage recalculation
```

---

## 💾 Data Export & Recovery

### Export Options

#### JSON Export
Complete organization data in structured format:
```json
{
  "organization": { "name": "...", "plan": "..." },
  "projects": [...],
  "clients": [...],
  "members": [...],
  "tasks": [...],
  "exportedAt": "2025-06-26T..."
}
```

#### CSV Export
Spreadsheet-friendly format for each data type:
- `projects.csv`
- `clients.csv` 
- `team_members.csv`
- `tasks.csv`

#### ZIP Archive
Complete backup with all files and documents included.

### Recovery System

Safe data restoration with validation:
1. **File Validation:** Structure and integrity checking
2. **Backup Creation:** Automatic backup before recovery
3. **Recovery Modes:** Full restore, partial restore, merge
4. **Progress Tracking:** Real-time recovery job monitoring

---

## 🔒 Security Features

### Organization Isolation
- Complete data separation between organizations
- No cross-organization data leakage possible
- Secure membership validation through Supabase

### Role-Based Access Control
- Granular permissions per role
- Project-level access restrictions
- Portal-specific authentication flows

### Data Protection
- Automatic plan compliance enforcement
- Usage violation tracking and blocking
- Secure file upload and storage handling

---

## 🧪 Testing

### Run Tests
```bash
npm test                 # All tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
```

### Test Coverage Areas
- Organization auto-creation flow
- Data isolation between organizations
- Plan enforcement and usage tracking
- Export/recovery system functionality
- Role-based access control
- Portal authentication and permissions

---

## 📈 Performance & Scalability

### Database Optimizations
- Indexed queries for organization-scoped data
- Efficient usage calculation algorithms
- Background job processing for exports/recovery

### Caching Strategy
- Organization membership caching
- Usage metrics caching with TTL
- Plan details and limits caching

### Monitoring
- Real-time usage tracking
- Performance metrics collection
- Error logging and alerting

---

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Clerk webhook endpoints configured
- [ ] Supabase service role key set
- [ ] File upload directories created
- [ ] Background job processing enabled

### Docker Deployment
```bash
docker build -t funnelhq-360-v3 .
docker run -p 3000:3000 --env-file .env funnelhq-360-v3
```

---

## 📚 API Documentation

### Authentication
All API routes require Clerk authentication and organization membership validation.

### Organization Management
```typescript
GET    /api/organizations/:id         # Get organization details
PUT    /api/organizations/:id         # Update organization
DELETE /api/organizations/:id         # Delete organization
```

### User Management  
```typescript
GET    /api/organizations/:id/members # List organization members
POST   /api/organizations/:id/invite  # Invite new member
DELETE /api/organizations/:id/members/:userId # Remove member
```

### Plan Management
```typescript
GET  /api/plans/features             # Get current plan features
GET  /api/plans/check-compliance     # Check plan compliance
GET  /api/plans/upgrade-recommendations # Get upgrade suggestions
```

---

## 🐛 Troubleshooting

### Common Issues

#### Organization Not Found Errors
**Cause:** User missing organization membership  
**Solution:** Check `organization_memberships` table for valid, active membership

#### Plan Enforcement Not Working
**Cause:** Middleware not applied to routes  
**Solution:** Verify `enforcePlanLimits` middleware is included in route definitions

#### Export/Recovery Failures
**Cause:** File permissions or Supabase connection issues  
**Solution:** Check environment variables and file system permissions

#### Portal Access Issues
**Cause:** Incorrect role assignments or project permissions  
**Solution:** Verify user role and project assignments in database

### Debug Mode
```bash
DEBUG=funnelhq:* npm run dev
```

---

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes with proper testing
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

### Code Standards
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Comprehensive test coverage required
- Documentation updates for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

For support and questions:
- 📧 Email: support@funnelhq.com
- 📖 Documentation: [docs.funnelhq.com](https://docs.funnelhq.com)
- 🐛 Issues: [GitHub Issues](https://github.com/naveends798/FunnelHQ-360-V3/issues)

---

## 🎉 Changelog

### V3.0.0 (June 26, 2025)
- ✨ **BREAKING:** Complete migration to organization-centric architecture
- ✨ **NEW:** Auto-organization creation on user signup
- ✨ **NEW:** Role-based portal system (Admin/Team/Client)
- ✨ **NEW:** Real-time usage monitoring and plan enforcement
- ✨ **NEW:** Enterprise-grade data export and recovery system
- ✨ **NEW:** Organization-level billing and plan management
- 🔒 **SECURITY:** Enhanced access control with data isolation
- 🚀 **PERFORMANCE:** Optimized queries with organization scoping
- 📊 **ANALYTICS:** Comprehensive usage tracking and reporting

### Previous Versions
- V2.0.0 - User-centric platform with basic team features
- V1.0.0 - Initial MVP release

---

*Built with ❤️ by the FunnelHQ Team*