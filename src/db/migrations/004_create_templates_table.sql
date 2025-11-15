-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  category VARCHAR(100),
  config JSONB NOT NULL, -- audio settings, effects, etc.
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  download_count INT DEFAULT 0,
  average_rating DECIMAL(2,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for templates table
CREATE INDEX IF NOT EXISTS idx_templates_public ON templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_creator ON templates(creator_id);

-- Create trigger for templates table
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
