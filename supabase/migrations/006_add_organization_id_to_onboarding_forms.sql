-- Add missing organization_id column to onboarding_forms table
-- This column is required for proper organization-scoped form management

ALTER TABLE onboarding_forms 
ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Set default organization_id to 1 for existing forms
UPDATE onboarding_forms 
SET organization_id = 1 
WHERE organization_id IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE onboarding_forms 
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_onboarding_forms_organization_id ON onboarding_forms(organization_id);
CREATE INDEX idx_onboarding_forms_project_id ON onboarding_forms(project_id);
CREATE INDEX idx_onboarding_forms_is_active ON onboarding_forms(is_active);