// Pre-built form templates for different onboarding scenarios

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: 'branding' | 'development' | 'marketing' | 'general';
  fields: FormField[];
  estimatedTime: string;
  icon: string;
}

export interface FormField {
  id: string;
  type: "text" | "email" | "tel" | "select" | "radio" | "checkbox" | "textarea" | "section";
  label: string;
  required: boolean;
  placeholder?: string;
  options: { label: string; value: string }[];
}

export const formTemplates: FormTemplate[] = [
  {
    id: "project-brief",
    title: "Project Brief & Requirements",
    description: "Comprehensive project scope and requirements gathering",
    category: "general",
    estimatedTime: "15-20 minutes",
    icon: "📋",
    fields: [
      {
        id: "section-overview",
        type: "section",
        label: "Project Overview",
        required: false,
        options: []
      },
      {
        id: "project-name",
        type: "text",
        label: "Project Name",
        required: true,
        placeholder: "Enter your project name",
        options: []
      },
      {
        id: "project-type",
        type: "select",
        label: "Project Type",
        required: true,
        options: [
          { label: "Website Development", value: "website" },
          { label: "Mobile App", value: "mobile" },
          { label: "Branding & Design", value: "branding" },
          { label: "E-commerce Platform", value: "ecommerce" },
          { label: "Marketing Campaign", value: "marketing" },
          { label: "Other", value: "other" }
        ]
      },
      {
        id: "project-description",
        type: "textarea",
        label: "Project Description",
        required: true,
        placeholder: "Describe your project in detail...",
        options: []
      },
      {
        id: "project-goals",
        type: "textarea",
        label: "Project Goals & Objectives",
        required: true,
        placeholder: "What are the main goals you want to achieve?",
        options: []
      },
      {
        id: "target-audience",
        type: "textarea",
        label: "Target Audience",
        required: true,
        placeholder: "Describe your target audience...",
        options: []
      },
      {
        id: "budget-range",
        type: "select",
        label: "Budget Range",
        required: true,
        options: [
          { label: "$5,000 - $10,000", value: "5k-10k" },
          { label: "$10,000 - $25,000", value: "10k-25k" },
          { label: "$25,000 - $50,000", value: "25k-50k" },
          { label: "$50,000 - $100,000", value: "50k-100k" },
          { label: "$100,000+", value: "100k+" }
        ]
      },
      {
        id: "timeline",
        type: "select",
        label: "Desired Timeline",
        required: true,
        options: [
          { label: "Rush (1-2 months)", value: "rush" },
          { label: "Standard (3-4 months)", value: "standard" },
          { label: "Extended (5-6 months)", value: "extended" },
          { label: "Flexible", value: "flexible" }
        ]
      },
      {
        id: "section-technical",
        type: "section",
        label: "Technical Requirements",
        required: false,
        options: []
      },
      {
        id: "platforms",
        type: "checkbox",
        label: "Platforms/Technologies",
        required: false,
        options: [
          { label: "Web (Desktop)", value: "web-desktop" },
          { label: "Web (Mobile)", value: "web-mobile" },
          { label: "iOS App", value: "ios" },
          { label: "Android App", value: "android" },
          { label: "Progressive Web App", value: "pwa" }
        ]
      },
      {
        id: "integrations",
        type: "textarea",
        label: "Required Integrations",
        required: false,
        placeholder: "List any third-party services or systems that need integration...",
        options: []
      },
      {
        id: "additional-notes",
        type: "textarea",
        label: "Additional Notes",
        required: false,
        placeholder: "Any additional information or special requirements...",
        options: []
      }
    ]
  },
  {
    id: "brand-questionnaire",
    title: "Brand Identity Questionnaire",
    description: "Comprehensive brand discovery and visual identity planning",
    category: "branding",
    estimatedTime: "20-25 minutes",
    icon: "🎨",
    fields: [
      {
        id: "section-brand-basics",
        type: "section",
        label: "Brand Basics",
        required: false,
        options: []
      },
      {
        id: "company-name",
        type: "text",
        label: "Company/Brand Name",
        required: true,
        placeholder: "Enter your company name",
        options: []
      },
      {
        id: "industry",
        type: "select",
        label: "Industry",
        required: true,
        options: [
          { label: "Technology", value: "technology" },
          { label: "Healthcare", value: "healthcare" },
          { label: "Finance", value: "finance" },
          { label: "Education", value: "education" },
          { label: "Retail/E-commerce", value: "retail" },
          { label: "Food & Beverage", value: "food" },
          { label: "Real Estate", value: "realestate" },
          { label: "Professional Services", value: "services" },
          { label: "Creative/Design", value: "creative" },
          { label: "Other", value: "other" }
        ]
      },
      {
        id: "brand-mission",
        type: "textarea",
        label: "Brand Mission Statement",
        required: true,
        placeholder: "What is your company's mission?",
        options: []
      },
      {
        id: "brand-values",
        type: "textarea",
        label: "Core Values",
        required: true,
        placeholder: "List your core brand values...",
        options: []
      },
      {
        id: "brand-personality",
        type: "checkbox",
        label: "Brand Personality Traits",
        required: true,
        options: [
          { label: "Professional", value: "professional" },
          { label: "Friendly", value: "friendly" },
          { label: "Innovative", value: "innovative" },
          { label: "Trustworthy", value: "trustworthy" },
          { label: "Creative", value: "creative" },
          { label: "Luxury", value: "luxury" },
          { label: "Playful", value: "playful" },
          { label: "Bold", value: "bold" },
          { label: "Minimalist", value: "minimalist" },
          { label: "Traditional", value: "traditional" }
        ]
      },
      {
        id: "section-visual",
        type: "section",
        label: "Visual Preferences",
        required: false,
        options: []
      },
      {
        id: "color-preferences",
        type: "textarea",
        label: "Color Preferences",
        required: false,
        placeholder: "Describe your color preferences or mention specific colors...",
        options: []
      },
      {
        id: "logo-style",
        type: "radio",
        label: "Preferred Logo Style",
        required: true,
        options: [
          { label: "Text-based (Typography)", value: "text" },
          { label: "Icon/Symbol", value: "icon" },
          { label: "Combination (Text + Icon)", value: "combination" },
          { label: "Badge/Emblem", value: "badge" }
        ]
      },
      {
        id: "design-style",
        type: "checkbox",
        label: "Design Style Preferences",
        required: false,
        options: [
          { label: "Modern/Contemporary", value: "modern" },
          { label: "Classic/Traditional", value: "classic" },
          { label: "Minimalist", value: "minimalist" },
          { label: "Bold/Dramatic", value: "bold" },
          { label: "Elegant/Sophisticated", value: "elegant" },
          { label: "Fun/Playful", value: "playful" },
          { label: "Corporate/Professional", value: "corporate" }
        ]
      },
      {
        id: "inspiration",
        type: "textarea",
        label: "Brand Inspiration",
        required: false,
        placeholder: "Share any brands you admire or design inspiration...",
        options: []
      },
      {
        id: "section-competitive",
        type: "section",
        label: "Competitive Landscape",
        required: false,
        options: []
      },
      {
        id: "competitors",
        type: "textarea",
        label: "Main Competitors",
        required: false,
        placeholder: "List your main competitors...",
        options: []
      },
      {
        id: "differentiation",
        type: "textarea",
        label: "What Makes You Different?",
        required: true,
        placeholder: "How do you differentiate from competitors?",
        options: []
      }
    ]
  },
  {
    id: "website-requirements",
    title: "Website Development Requirements",
    description: "Detailed website specification and feature requirements",
    category: "development",
    estimatedTime: "12-15 minutes",
    icon: "💻",
    fields: [
      {
        id: "section-website-basics",
        type: "section",
        label: "Website Basics",
        required: false,
        options: []
      },
      {
        id: "website-type",
        type: "select",
        label: "Website Type",
        required: true,
        options: [
          { label: "Business/Corporate", value: "business" },
          { label: "E-commerce", value: "ecommerce" },
          { label: "Portfolio", value: "portfolio" },
          { label: "Blog/News", value: "blog" },
          { label: "Landing Page", value: "landing" },
          { label: "Directory/Listing", value: "directory" },
          { label: "Community/Forum", value: "community" }
        ]
      },
      {
        id: "pages-needed",
        type: "checkbox",
        label: "Required Pages",
        required: true,
        options: [
          { label: "Home", value: "home" },
          { label: "About", value: "about" },
          { label: "Services/Products", value: "services" },
          { label: "Contact", value: "contact" },
          { label: "Blog", value: "blog" },
          { label: "Portfolio/Gallery", value: "portfolio" },
          { label: "Testimonials", value: "testimonials" },
          { label: "FAQ", value: "faq" },
          { label: "Privacy Policy", value: "privacy" },
          { label: "Terms of Service", value: "terms" }
        ]
      },
      {
        id: "content-management",
        type: "radio",
        label: "Content Management Needs",
        required: true,
        options: [
          { label: "No CMS needed (static site)", value: "none" },
          { label: "Simple editing (text/images)", value: "simple" },
          { label: "Full CMS (blog, pages, media)", value: "full" },
          { label: "Custom admin panel", value: "custom" }
        ]
      },
      {
        id: "section-features",
        type: "section",
        label: "Features & Functionality",
        required: false,
        options: []
      },
      {
        id: "required-features",
        type: "checkbox",
        label: "Required Features",
        required: false,
        options: [
          { label: "Contact Forms", value: "contact-forms" },
          { label: "Newsletter Signup", value: "newsletter" },
          { label: "Social Media Integration", value: "social" },
          { label: "Search Functionality", value: "search" },
          { label: "User Accounts/Login", value: "accounts" },
          { label: "Payment Processing", value: "payments" },
          { label: "Booking/Scheduling", value: "booking" },
          { label: "Live Chat", value: "chat" },
          { label: "Multi-language", value: "multilang" },
          { label: "Analytics", value: "analytics" }
        ]
      },
      {
        id: "integrations-needed",
        type: "textarea",
        label: "Third-party Integrations",
        required: false,
        placeholder: "List any third-party services you need to integrate (CRM, email marketing, etc.)",
        options: []
      },
      {
        id: "section-design",
        type: "section",
        label: "Design Preferences",
        required: false,
        options: []
      },
      {
        id: "design-inspiration",
        type: "textarea",
        label: "Design Inspiration",
        required: false,
        placeholder: "Share any websites you like or design preferences...",
        options: []
      },
      {
        id: "mobile-priority",
        type: "radio",
        label: "Mobile Experience Priority",
        required: true,
        options: [
          { label: "Mobile-first design", value: "mobile-first" },
          { label: "Equal desktop/mobile focus", value: "equal" },
          { label: "Desktop-first design", value: "desktop-first" }
        ]
      }
    ]
  },
  {
    id: "marketing-campaign",
    title: "Marketing Campaign Brief",
    description: "Campaign strategy and creative requirements gathering",
    category: "marketing",
    estimatedTime: "10-12 minutes",
    icon: "📈",
    fields: [
      {
        id: "section-campaign-overview",
        type: "section",
        label: "Campaign Overview",
        required: false,
        options: []
      },
      {
        id: "campaign-name",
        type: "text",
        label: "Campaign Name",
        required: true,
        placeholder: "Enter campaign name",
        options: []
      },
      {
        id: "campaign-type",
        type: "select",
        label: "Campaign Type",
        required: true,
        options: [
          { label: "Product Launch", value: "product-launch" },
          { label: "Brand Awareness", value: "brand-awareness" },
          { label: "Lead Generation", value: "lead-generation" },
          { label: "Sales Promotion", value: "sales-promotion" },
          { label: "Event Marketing", value: "event" },
          { label: "Content Marketing", value: "content" },
          { label: "Rebranding", value: "rebranding" }
        ]
      },
      {
        id: "campaign-objectives",
        type: "textarea",
        label: "Campaign Objectives",
        required: true,
        placeholder: "What are the main goals of this campaign?",
        options: []
      },
      {
        id: "target-demographics",
        type: "textarea",
        label: "Target Demographics",
        required: true,
        placeholder: "Describe your target audience demographics...",
        options: []
      },
      {
        id: "section-channels",
        type: "section",
        label: "Marketing Channels",
        required: false,
        options: []
      },
      {
        id: "marketing-channels",
        type: "checkbox",
        label: "Preferred Marketing Channels",
        required: true,
        options: [
          { label: "Social Media (Facebook, Instagram)", value: "social-meta" },
          { label: "LinkedIn", value: "linkedin" },
          { label: "Twitter", value: "twitter" },
          { label: "Google Ads", value: "google-ads" },
          { label: "Email Marketing", value: "email" },
          { label: "Content Marketing/Blog", value: "content" },
          { label: "Influencer Marketing", value: "influencer" },
          { label: "Print Advertising", value: "print" },
          { label: "Radio/Podcast", value: "audio" },
          { label: "TV/Video", value: "video" }
        ]
      },
      {
        id: "campaign-budget",
        type: "select",
        label: "Campaign Budget",
        required: true,
        options: [
          { label: "$1,000 - $5,000", value: "1k-5k" },
          { label: "$5,000 - $15,000", value: "5k-15k" },
          { label: "$15,000 - $50,000", value: "15k-50k" },
          { label: "$50,000+", value: "50k+" }
        ]
      },
      {
        id: "campaign-duration",
        type: "select",
        label: "Campaign Duration",
        required: true,
        options: [
          { label: "1-2 weeks", value: "1-2weeks" },
          { label: "1 month", value: "1month" },
          { label: "2-3 months", value: "2-3months" },
          { label: "6 months", value: "6months" },
          { label: "Ongoing", value: "ongoing" }
        ]
      },
      {
        id: "success-metrics",
        type: "textarea",
        label: "Success Metrics",
        required: true,
        placeholder: "How will you measure campaign success?",
        options: []
      }
    ]
  }
];

export const getTemplatesByCategory = (category?: string) => {
  if (!category) return formTemplates;
  return formTemplates.filter(template => template.category === category);
};

export const getTemplateById = (id: string) => {
  return formTemplates.find(template => template.id === id);
};