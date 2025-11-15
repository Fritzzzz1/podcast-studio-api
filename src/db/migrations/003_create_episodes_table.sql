-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_seconds INT,
  audio_file_url TEXT, -- S3/GCS URL
  audio_file_size_bytes BIGINT,
  waveform_data JSONB,
  recorded_at TIMESTAMP,
  template_id UUID,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'processing', 'ready'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Create indexes for episodes table
CREATE INDEX IF NOT EXISTS idx_episodes_project ON episodes(project_id);

-- Create trigger for episodes table
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
