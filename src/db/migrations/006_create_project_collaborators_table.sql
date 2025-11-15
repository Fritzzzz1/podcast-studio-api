-- Create project_collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(50) DEFAULT 'view', -- 'view', 'comment', 'edit'
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Create indexes for project_collaborators table
CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON project_collaborators(user_id);
