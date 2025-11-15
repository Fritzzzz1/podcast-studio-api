-- Create template_ratings table
CREATE TABLE IF NOT EXISTS template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Create indexes for template_ratings table
CREATE INDEX IF NOT EXISTS idx_ratings_template ON template_ratings(template_id);
