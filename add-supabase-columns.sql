-- Add missing columns to clients table for proper data persistence

-- Add created_at column (required by the application)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add user tracking columns for better data management
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS created_by_clerk_id TEXT,
ADD COLUMN IF NOT EXISTS created_by_email TEXT;

-- Update existing records to have created_at if they don't have it
UPDATE clients 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by_clerk_id);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;