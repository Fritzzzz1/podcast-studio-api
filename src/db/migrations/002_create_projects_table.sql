-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  deleted_at TIMESTAMP -- soft delete
);

-- Create indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public) WHERE deleted_at IS NULL;

-- Create trigger for projects table
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
