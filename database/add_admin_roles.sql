-- Add admin role tracking to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set your account as admin
UPDATE users
SET role = 'admin', is_admin = TRUE
WHERE id = 10;  -- amanullahnaqvi@gmail.com

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

COMMENT ON COLUMN users.role IS 'User role: user, admin, moderator, etc.';
COMMENT ON COLUMN users.is_admin IS 'Quick check for admin privileges';

