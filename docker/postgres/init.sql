-- E10: Postgres initialization script run as superuser 'postgres'
-- Superuser creates the database, enables pg_trgm extension, and sets up least-privilege vrm_app role

CREATE DATABASE vrm;

\c vrm;

-- Create pg_trgm extension in vrm database as superuser
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create non-superuser role vrm_app if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'vrm_app') THEN
    CREATE ROLE vrm_app WITH LOGIN PASSWORD 'vrm_secure_password';
  END IF;
END
$$;

-- Grant ownership and schema permissions to vrm_app
ALTER DATABASE vrm OWNER TO vrm_app;
GRANT ALL PRIVILEGES ON DATABASE vrm TO vrm_app;
GRANT ALL ON SCHEMA public TO vrm_app;
ALTER SCHEMA public OWNER TO vrm_app;

-- Ensure future tables created by vrm_app are owned properly
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vrm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vrm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO vrm_app;
