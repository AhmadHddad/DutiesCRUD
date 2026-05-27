CREATE INDEX IF NOT EXISTS duties_created_at_id_idx
ON duties (created_at DESC, id DESC);
