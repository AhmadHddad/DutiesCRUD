CREATE TABLE IF NOT EXISTS duties (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(256) NOT NULL CHECK (length(trim(name)) > 0),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_duties_updated_at ON duties;

CREATE TRIGGER set_duties_updated_at
BEFORE UPDATE ON duties
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS duties_created_at_id_idx
ON duties (created_at DESC, id DESC);
