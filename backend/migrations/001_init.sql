-- Cattle Manager schema. Every table that holds farm data is owned by a user
-- and cascades on delete, so removing an account (or an expired demo sandbox)
-- leaves nothing behind.

CREATE TABLE users (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username        TEXT        NOT NULL UNIQUE CHECK (username = lower(username) AND char_length(username) BETWEEN 3 AND 40),
  password_hash   TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'owner' CHECK (role IN ('owner')),
  is_demo         BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  session_version INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_demo_expiry_idx ON users (expires_at) WHERE is_demo;

CREATE TABLE cattle (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tag           TEXT        NOT NULL CHECK (char_length(tag) BETWEEN 1 AND 32),
  breed         TEXT        NOT NULL CHECK (char_length(breed) BETWEEN 1 AND 64),
  sex           TEXT        CHECK (sex IN ('Male', 'Female')),
  date_of_birth DATE,
  status        TEXT        NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Sold', 'Deceased')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag)
);

CREATE TABLE daily_counts (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  count      INTEGER     NOT NULL CHECK (count BETWEEN 0 AND 1000000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX daily_counts_user_idx ON daily_counts (user_id, date DESC, id DESC);

CREATE TABLE movements (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('IN', 'OUT', 'SOLD', 'DIED')),
  quantity   INTEGER     NOT NULL CHECK (quantity BETWEEN 1 AND 100000),
  note       TEXT        CHECK (char_length(note) <= 500),
  date       DATE        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX movements_user_idx ON movements (user_id, date DESC, id DESC);

CREATE TABLE vaccinations (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cattle_id     INTEGER NOT NULL REFERENCES cattle (id) ON DELETE CASCADE,
  vaccine_name  TEXT    NOT NULL CHECK (char_length(vaccine_name) BETWEEN 1 AND 100),
  date_given    DATE    NOT NULL,
  next_due_date DATE,
  notes         TEXT    CHECK (char_length(notes) <= 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vaccinations_cattle_idx ON vaccinations (cattle_id);

CREATE TABLE weights (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cattle_id  INTEGER          NOT NULL REFERENCES cattle (id) ON DELETE CASCADE,
  date       DATE             NOT NULL,
  weight_kg  DOUBLE PRECISION NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 3000),
  created_at TIMESTAMPTZ      NOT NULL DEFAULT now()
);
CREATE INDEX weights_cattle_idx ON weights (cattle_id, date);

-- Fixed-window counters shared by every serverless instance (an in-memory
-- limiter would be reset on each cold start and per-instance).
CREATE TABLE rate_limits (
  key          TEXT        PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL
);
