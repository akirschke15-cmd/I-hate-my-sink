-- IHMS Database Initialization Script
-- This script runs when the PostgreSQL container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a default company for development
INSERT INTO companies (id, name, slug, email, is_active, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Demo Company',
  'demo',
  'admin@demo.com',
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Note: Tables are created by Drizzle migrations
-- This script is for initial seed data and extensions only
