-- Offline sync support. The app queues changes made without signal and uploads
-- them later; a flaky connection can make it send the same change twice.
-- Each upload carries an Idempotency-Key, and the first response for a key is
-- stored here so a repeat is answered with the original result instead of
-- creating a duplicate. status = 0 means "claimed, still being processed".

CREATE TABLE idempotency_keys (
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  idem_key   TEXT        NOT NULL,
  status     INTEGER     NOT NULL DEFAULT 0,
  body       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idem_key)
);
CREATE INDEX idempotency_keys_created_idx ON idempotency_keys (created_at);
