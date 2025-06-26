# Role-Based Access Control Implementation

## Overview

This document outlines the comprehensive role-based access control (RBAC) system implemented for the Funnel Portal application. The system provides fine-grained permissions management for different user roles within organizations and projects.

## Architecture

### 1. Database Schema Enhancements

#### New Tables Added:
- **`project_team_members`**: Manages explicit project-user-role associations
  - Replaces the simple JSON array approach with relational data
  - Includes project-specific roles and permissions
  - Tracks assignment history and status

#### Enhanced Tables:
- **`projects`**: Added `organizationId`, `createdBy`, `createdAt`, `updatedAt` fields
- **`users`**: Already had organization support
- **`user_roles`**: Organization-level roles (admin, team_member, client)

### 2. Permission System

#### Organizational Roles:
- **Admin**: Full system access, can manage everything
- **Team Member**: Limited access based on project assignments
- **Client**: Read-only access to assigned projects

#### Project-Specific Roles:
- **Project Manager**: Full project control, can assign team members
- **Developer**: Task management, document upload
- **Designer**: Design management, task updates
- **Reviewer**: Review and comment permissions
- **Client**: View and comment only

#### Permission Matrix:
```
Resource         | Admin | Team Member | Client
-------------------------------------------------
projects:view_all    | ✓     | -          | -
projects:view_assigned| ✓     | ✓          | ✓
projects:create      | ✓     | -          | -
projects:update      | ✓     | ✓*         | -
projects:delete      | ✓     | -          | -
projects:manage_team | ✓     | ✓*         | -
clients:view_all     | ✓     | -          | -
clients:create       | ✓     | -          | -
documents:upload     | ✓     | ✓          | ✓*
```
*Limited to assigned projects

### 3. API Layer Updates

#### New Endpoints:
- `GET /api/projects/:projectId/team-members` - Get project team
- `POST /api/projects/:projectId/team-members` - Add team member
- `PATCH /api/project-team-members/:id` - Update member role
- `DELETE /api/project-team-members/:id` - Remove team member
- `GET /api/projects/:projectId/user/:userId/role` - Get user's project role

#### Enhanced Endpoints:
- `GET /api/projects` - Now supports user filtering with `?userId=X&organizationId=Y`

### 4. Frontend Components

#### New Components:
- **`AssignTeamModal`**: Comprehensive team management interface
  - Add/remove team members
  - Assign project-specific roles
  - Permission visualization
  - Role-based access controls

#### Enhanced Components:
- **`ProjectCard`**: 
  - Shows actual team member avatars
  - Role-based action buttons (manage team, edit project)
  - Permission-aware UI elements

- **`Sidebar`**: 
  - Navigation filtered by user permissions
  - Role-specific menu items

- **`QuickActions`**: 
  - Actions filtered by permissions
  - Dynamic content based on role

- **`Dashboard`**: 
  - Projects filtered by user access
  - Role-aware create buttons

### 5. Security Implementation

#### Client-Side Security:
- Permission checks on all UI components
- Role-based navigation restrictions
- Dynamic content rendering based on permissions

#### Server-Side Security:
- User access validation on all project endpoints
- Organization-level data isolation
- Project assignment verification

## Usage Examples

### 1. Adding a Team Member to a Project

```typescript
// Admin or Project Manager can assign team members
const member = await storage.addProjectTeamMember({
  projectId: 1,
  userId: 2,
  role: "developer",
  permissions: ["project:view", "project:manage_tasks"],
  assignedBy: currentUserId,
  isActive: true
});
```

### 2. Checking Project Access

```typescript
// Server-side project access check
const userRole = await storage.getUserProjectRole(projectId, userId);
if (!userRole && !isUserAdmin(userId)) {
  return res.status(403).json({ error: "Access denied" });
}
```

### 3. Permission-Based UI Rendering

```tsx
// Component renders based on permissions
{hasPermission("projects", "assign_members") && (
  <Button onClick={openTeamModal}>
    <UserPlus className="h-4 w-4" />
    Manage Team
  </Button>
)}
```

## Development Features

### Role Switcher (Development Mode):
- Switch between admin, team_member, and client roles
- Mock authentication for testing
- Real-time permission updates
- Development-only feature with production fallback

### Testing Access Levels:
1. **Admin Role**: Access to all projects and management features
2. **Team Member**: Only assigned projects visible, limited actions
3. **Client Role**: View-only access to assigned projects

## Data Migration

The implementation includes backward compatibility:
- Existing `teamMembers` JSON field is deprecated but maintained
- Sample data creates proper project team assignments
- Smooth transition from old to new team management system

## Benefits

1. **Fine-Grained Control**: Project-level role assignments
2. **Scalable Architecture**: Supports complex organizational structures
3. **Security**: Proper access validation at all levels
4. **User Experience**: Role-appropriate interfaces
5. **Maintainability**: Clear separation of concerns
6. **Flexibility**: Easy to extend with new roles and permissions

## Future Enhancements

1. **Custom Permissions**: Allow organizations to define custom permissions
2. **Role Templates**: Pre-defined role templates for quick assignment
3. **Audit Trail**: Track all permission changes and access attempts
4. **Advanced Filtering**: More sophisticated project filtering options
5. **Bulk Operations**: Assign multiple users to projects simultaneously

## Files Modified/Created

### New Files:
- `/client/src/components/assign-team-modal.tsx`
- `/RBAC_IMPLEMENTATION.md`

### Modified Files:
- `/shared/schema.ts` - Enhanced with project team members table
- `/server/storage.ts` - Added team member management methods
- `/server/routes.ts` - Added team management endpoints
- `/client/src/lib/permissions.ts` - Enhanced permission system
- `/client/src/components/project-card.tsx` - Role-based UI updates
- `/client/src/components/quick-actions.tsx` - Permission-filtered actions
- `/client/src/pages/dashboard.tsx` - User-filtered project queries
- `/client/src/hooks/useAuth.tsx` - Enhanced with project permissions

The implementation provides a robust, scalable, and user-friendly role-based access control system that can grow with the organization's needs while maintaining security and usability.