# Testing Guide for FunnelHQ 360

## Overview

This project uses Vitest for unit testing with React Testing Library for component testing. The tests focus on authentication, authorization, and role-based access control.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
client/src/
├── __mocks__/              # Module mocks
│   └── @clerk/             # Clerk SDK mocks
├── test/                   # Test utilities
│   ├── setup.ts           # Test environment setup
│   └── clerk-test-utils.tsx # Clerk testing utilities
├── components/__tests__/   # Component tests
│   ├── route-guard.test.tsx
│   └── ...
└── hooks/__tests__/        # Hook tests
    ├── useRouteGuard.test.tsx
    ├── usePlanFeatures.test.tsx
    └── ...
```

## Key Test Areas

### 1. Authentication Tests
- User sign-in/sign-out flows
- Session management
- Token validation

### 2. Authorization Tests
- Role-based access (admin, team_member, client)
- Permission checking
- Route protection

### 3. Organization Tests
- Multi-tenancy support
- Organization switching
- Membership roles

### 4. Plan Feature Tests
- Trial expiration
- Feature limits
- Upgrade prompts

### 5. Route Redirection Tests
- Role-based redirects
- Unauthorized access handling
- Trial expiration redirects

## Writing Tests

### Testing Hooks

```typescript
import { renderHook } from '@testing-library/react';
import { setupClerkMocks } from '@/test/clerk-test-utils';

describe('useCustomHook', () => {
  it('should handle authentication', () => {
    setupClerkMocks({
      auth: { isSignedIn: true },
      user: { publicMetadata: { role: 'admin' } }
    });
    
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.isAuthorized).toBe(true);
  });
});
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render for admin users', () => {
    setupClerkMocks({
      organization: { membership: { role: 'admin' } }
    });
    
    render(<MyComponent />);
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
```

### Testing Route Protection

```typescript
describe('Route Protection', () => {
  it('should redirect unauthorized users', async () => {
    const mockSetLocation = vi.fn();
    setupClerkMocks({ auth: { isSignedIn: false } });
    
    render(<ProtectedRoute />);
    
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/login');
    });
  });
});
```

## Mock Utilities

### Clerk Mocks

The `clerk-test-utils.tsx` provides utilities for mocking Clerk:

- `setupClerkMocks()` - Configure Clerk state
- `resetClerkMocks()` - Reset all mocks
- `mockAdminUser` - Pre-configured admin user
- `mockTeamMemberUser` - Pre-configured team member
- `mockClientUser` - Pre-configured client user
- `mockExpiredTrial` - Organization with expired trial

### Common Test Scenarios

1. **Test Different User Roles**
```typescript
const roles = ['admin', 'team_member', 'client'];
roles.forEach(role => {
  it(`should handle ${role} role`, () => {
    setupClerkMocks({ user: { publicMetadata: { role } } });
    // Test role-specific behavior
  });
});
```

2. **Test Trial Expiration**
```typescript
it('should handle expired trial', () => {
  setupClerkMocks({
    organization: {
      publicMetadata: {
        plan: 'pro_trial',
        trialEndsAt: new Date(Date.now() - 1).toISOString()
      }
    }
  });
  // Test trial expiration behavior
});
```

3. **Test Permission Checking**
```typescript
it('should check permissions', () => {
  const mockHasPermission = vi.fn((resource, action) => 
    resource === 'projects' && action === 'create'
  );
  // Test permission-based access
});
```

## Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

Focus areas for coverage:
- Authentication flows
- Authorization logic
- Error handling
- Edge cases (expired trials, missing permissions, etc.)

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run tests
  run: npm test -- --run

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

1. **Mock not working**
   - Ensure mocks are set up before rendering
   - Check mock file paths match actual modules

2. **Async test failures**
   - Use `waitFor` for async operations
   - Ensure all promises are resolved

3. **Route test failures**
   - Mock `wouter` properly
   - Set location before rendering

### Debug Tips

- Use `screen.debug()` to see rendered output
- Add `console.log` in mocks to verify calls
- Use `vi.spyOn` to track function calls
- Check test setup file for global configurations