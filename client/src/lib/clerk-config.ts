export const clerkAppearance = {
  elements: {
    rootBox: "mx-auto",
    card: "bg-gray-800 border border-gray-700 shadow-xl",
    headerTitle: "text-white",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButton: "bg-gray-700 border-gray-600 text-white hover:bg-gray-600",
    formFieldLabel: "text-gray-300",
    formFieldInput: "bg-gray-700 border-gray-600 text-white",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
    footerActionLink: "text-blue-400 hover:text-blue-300",
    identityPreviewText: "display: none;",
    identityPreviewEditButton: "display: none;",
    identityPreview: "display: none;",
    userPreview: "display: none;",
    userPreviewMainIdentifier: "display: none;",
    userPreviewSecondaryIdentifier: "display: none;",
    formFieldAction: "text-blue-400 hover:text-blue-300",
    otpCodeFieldInput: "bg-gray-700 border-gray-600 text-white text-center",
    formResendCodeLink: "text-blue-400 hover:text-blue-300",
    alternativeMethodsBlockButton: "bg-gray-700 border-gray-600 text-white hover:bg-gray-600",
    formHeaderTitle: "text-xl font-semibold text-white",
    formHeaderSubtitle: "text-gray-400",
    dividerLine: "bg-gray-700",
    dividerText: "text-gray-400",
    verificationLinkStatusIconBox__verified: "bg-green-500/20",
    verificationLinkStatusText__verified: "text-green-400",
    alert__danger: "bg-red-900/20 border-red-800 text-red-400",
    alert__warning: "bg-yellow-900/20 border-yellow-800 text-yellow-400"
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    showOptionalFields: true
  },
  variables: {
    colorPrimary: "#2563eb"
  }
};

// Enable magic link and OTP for passwordless authentication
export const clerkSignInFactors = {
  emailAddress: true,
  emailCode: true, // Magic link via email
  phoneCode: true, // OTP via SMS
  password: true,
  oauth_google: true // Social login
};

export const clerkSignUpOptions = {
  // Fields to collect during signup
  firstName: true,
  lastName: true,
  emailAddress: true,
  password: true,
  phoneNumber: false, // Optional
  
  // Temporarily disable verification for testing
  emailVerification: false, // Changed to false for easier testing
  phoneVerification: false
};