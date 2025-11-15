-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  avatar_url TEXT,
  oauth_provider VARCHAR(50), -- 'google', 'apple', null
  oauth_id VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  storage_quota_bytes BIGINT DEFAULT 5368709120, -- 5GB in bytes
  storage_used_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
