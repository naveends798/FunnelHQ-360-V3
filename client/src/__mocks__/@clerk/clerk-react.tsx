import { vi } from 'vitest';
import { 
  mockUseAuth, 
  mockUseUser, 
  mockUseOrganization, 
  mockUseOrganizationList,
  MockClerkProvider 
} from '../test/clerk-test-utils';

// Export mocked hooks
export const useAuth = mockUseAuth;
export const useUser = mockUseUser;
export const useOrganization = mockUseOrganization;
export const useOrganizationList = mockUseOrganizationList;

// Export mocked components
export const ClerkProvider = MockClerkProvider;
export const SignIn = vi.fn(() => <div data-testid="mock-sign-in">Sign In</div>);
export const SignUp = vi.fn(() => <div data-testid="mock-sign-up">Sign Up</div>);
export const SignedIn = vi.fn(({ children }: any) => <>{children}</>);
export const SignedOut = vi.fn(({ children }: any) => <>{children}</>);
export const RedirectToSignIn = vi.fn(() => <div data-testid="mock-redirect-to-sign-in">Redirect to Sign In</div>);

// Mock auth types
export type { User } from '@clerk/types';
export type { Organization } from '@clerk/types';