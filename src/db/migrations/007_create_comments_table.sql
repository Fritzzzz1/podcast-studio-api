-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp_seconds DECIMAL(10,2), -- timestamp in episode
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for comments table
CREATE INDEX IF NOT EXISTS idx_comments_episode ON comments(episode_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- Create trigger for comments table
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
