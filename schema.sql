-- CodeMind AI PostgreSQL Supabase Database Schema

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    source_type TEXT NOT NULL, -- 'github' | 'zip' | 'folder' | 'file'
    github_url TEXT,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    overall_score INTEGER NOT NULL,
    security_score INTEGER NOT NULL,
    architecture_score INTEGER NOT NULL,
    performance_score INTEGER NOT NULL,
    maintainability_score INTEGER NOT NULL,
    summary TEXT,
    review_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Memories Table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    memory_type TEXT NOT NULL, -- e.g., 'security', 'architecture', 'performance'
    title TEXT NOT NULL,
    description TEXT,
    memory_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Vulnerabilities Table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'safe' | 'medium' | 'high' | 'critical'
    status TEXT NOT NULL, -- 'open' | 'resolved'
    vulnerability_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Team Standards Table
CREATE TABLE IF NOT EXISTS team_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'security', 'architecture', 'performance'
    rule_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Dependency Graphs Table
CREATE TABLE IF NOT EXISTS dependency_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    graph_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- DISABLE Row Level Security (RLS) on all tables to allow local testing and prevent RLS failures
-- Run these commands to disable RLS if your Clerk auth JWT synchronization is not fully configured.
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_standards DISABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_graphs DISABLE ROW LEVEL SECURITY;

-- Create GIN indexes for fast querying of JSONB properties
CREATE INDEX IF NOT EXISTS idx_memories_data ON memories USING gin (memory_data);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_data ON vulnerabilities USING gin (vulnerability_data);
CREATE INDEX IF NOT EXISTS idx_team_standards_data ON team_standards USING gin (rule_data);
CREATE INDEX IF NOT EXISTS idx_dependency_graphs_data ON dependency_graphs USING gin (graph_data);
CREATE INDEX IF NOT EXISTS idx_reviews_metadata ON reviews USING gin (review_metadata);

-- Add database trigger helper to auto-update updated_at on projects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
