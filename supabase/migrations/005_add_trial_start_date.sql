-- Add trial start date to users table for trial period tracking
ALTER TABLE users 
ADD COLUMN trial_start_date TIMESTAMPTZ;

-- Add index for efficient trial date queries
CREATE INDEX idx_users_trial_start_date ON users(trial_start_date);

-- Update existing users to set trial start date to their created_at date if they don't have a paid subscription
UPDATE users 
SET trial_start_date = created_at 
WHERE trial_start_date IS NULL 
  AND subscription_plan != 'pro' 
  AND stripe_subscription_id IS NULL;