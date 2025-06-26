import React from 'react';
import { vi } from 'vitest';

// Mock Clerk hooks
export const mockUseAuth = vi.fn();
export const mockUseUser = vi.fn();
export const mockUseOrganization = vi.fn();
export const mockUseOrganizationList = vi.fn();

// Default mock implementations
export const defaultAuthState = {
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_test123',
  sessionId: 'session_test123',
  signOut: vi.fn(),
};

export const defaultUserState = {
  isLoaded: true,
  isSignedIn: true,
  user: {
    id: 'user_test123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    publicMetadata: {
      role: 'admin',
      onboardingCompleted: true,
    },
    update: vi.fn(),
  },
};

export const defaultOrganizationState = {
  isLoaded: true,
  organization: {
    id: 'org_test123',
    name: 'Test Organization',
    publicMetadata: {
      plan: 'pro_trial',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    update: vi.fn(),
    inviteMember: vi.fn(),
    revokeInvitation: vi.fn(),
  },
  membership: {
    id: 'mem_test123',
    role: 'admin',
  },
  invitations: [],
};

export const defaultOrganizationListState = {
  isLoaded: true,
  organizationList: [
    {
      organization: defaultOrganizationState.organization,
      membership: defaultOrganizationState.membership,
    },
  ],
  createOrganization: vi.fn(),
  setActive: vi.fn(),
};

// Mock Clerk provider
export const MockClerkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Setup Clerk mocks
export function setupClerkMocks(overrides?: {
  auth?: Partial<typeof defaultAuthState>;
  user?: Partial<typeof defaultUserState>;
  organization?: Partial<typeof defaultOrganizationState>;
  organizationList?: Partial<typeof defaultOrganizationListState>;
}) {
  mockUseAuth.mockReturnValue({
    ...defaultAuthState,
    ...overrides?.auth,
  });

  mockUseUser.mockReturnValue({
    ...defaultUserState,
    ...overrides?.user,
  });

  mockUseOrganization.mockReturnValue({
    ...defaultOrganizationState,
    ...overrides?.organization,
  });

  mockUseOrganizationList.mockReturnValue({
    ...defaultOrganizationListState,
    ...overrides?.organizationList,
  });
}

// Reset all mocks
export function resetClerkMocks() {
  mockUseAuth.mockReset();
  mockUseUser.mockReset();
  mockUseOrganization.mockReset();
  mockUseOrganizationList.mockReset();
}

// Mock different user roles
export const mockAdminUser = {
  ...defaultUserState,
  user: {
    ...defaultUserState.user,
    publicMetadata: { role: 'admin' },
  },
};

export const mockTeamMemberUser = {
  ...defaultUserState,
  user: {
    ...defaultUserState.user,
    publicMetadata: { role: 'team_member' },
  },
};

export const mockClientUser = {
  ...defaultUserState,
  user: {
    ...defaultUserState.user,
    publicMetadata: { role: 'client' },
  },
};

// Mock expired trial
export const mockExpiredTrial = {
  ...defaultOrganizationState,
  organization: {
    ...defaultOrganizationState.organization,
    publicMetadata: {
      plan: 'pro_trial',
      trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    },
  },
};