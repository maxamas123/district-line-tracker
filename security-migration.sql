-- ============================================================
-- Fix The District - Security Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- AFTER the initial supabase-setup.sql has been applied.
--
-- This hardens the database by:
--   1. Adding token-based ownership for reports
--   2. Removing overly permissive UPDATE/DELETE policies
--   3. Moving insert/edit/delete to validated RPC functions
--   4. Restricting tfl_status_log to service role only
--   5. Adding server-side data validation
-- ============================================================


-- 1. Create report_tokens table for ownership verification
-- With RLS enabled and NO policies, the anon role cannot read this table directly.
-- All access goes through SECURITY DEFINER functions.

CREATE TABLE IF NOT EXISTS report_tokens (
    report_id UUID PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
    owner_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE report_tokens ENABLE ROW LEVEL SECURITY;
-- No policies = anon cannot SELECT, INSERT, UPDATE, or DELETE


-- 2. Remove the overly permissive policies
DROP POLICY IF EXISTS "Anyone can upvote reports" ON reports;
DROP POLICY IF EXISTS "Anyone can delete reports" ON reports;
DROP POLICY IF EXISTS "Anyone can insert reports" ON reports;

-- With no INSERT/UPDATE/DELETE policies and RLS enabled,
-- anon users cannot directly modify the reports table.
-- The service_role key (used by cron) bypasses RLS entirely.
-- All writes now go through SECURITY DEFINER RPC functions.


-- 3. Restrict tfl_status_log to service role only
-- Remove the permissive insert policy. With no INSERT policy,
-- anon can't insert. The service_role key bypasses RLS.
DROP POLICY IF EXISTS "Service can insert tfl status" ON tfl_status_log;


-- 4. RPC: Create a report (with ownership token + validation)
CREATE OR REPLACE FUNCTION create_report(
    p_incident_date DATE,
    p_incident_time TIME,
    p_station TEXT,
    p_direction TEXT,
    p_category TEXT,
    p_delay_minutes INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_reporter_name TEXT DEFAULT 'Anonymous',
    p_tfl_status_severity INTEGER DEFAULT NULL,
    p_tfl_status_description TEXT DEFAULT NULL,
    p_tfl_status_reason TEXT DEFAULT NULL,
    p_owner_token TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    -- Validate delay
    IF p_delay_minutes IS NOT NULL AND (p_delay_minutes < 0 OR p_delay_minutes > 60) THEN
        RAISE EXCEPTION 'Delay must be between 0 and 60 minutes';
    END IF;

    -- Validate station
    IF p_station NOT IN (
        'Wimbledon', 'Wimbledon Park', 'Southfields', 'East Putney',
        'Putney Bridge', 'Parsons Green', 'Fulham Broadway', 'West Brompton', 'Earls Court'
    ) THEN
        RAISE EXCEPTION 'Invalid station';
    END IF;

    -- Validate category
    IF p_category NOT IN (
        'General Delays', 'Signal Failure', 'Overcrowding', 'Train Cancellation',
        'Reduced Service', 'Poor Comms', 'Safety Concern', 'Other'
    ) THEN
        RAISE EXCEPTION 'Invalid category';
    END IF;

    -- Validate direction
    IF p_direction NOT IN (
        'Eastbound (towards Earls Court)', 'Westbound (towards Wimbledon)', 'Both / General'
    ) THEN
        RAISE EXCEPTION 'Invalid direction';
    END IF;

    -- Truncate long text fields to prevent abuse
    IF p_description IS NOT NULL AND LENGTH(p_description) > 1000 THEN
        p_description := LEFT(p_description, 1000);
    END IF;
    IF p_reporter_name IS NOT NULL AND LENGTH(p_reporter_name) > 100 THEN
        p_reporter_name := LEFT(p_reporter_name, 100);
    END IF;

    -- Insert the report
    INSERT INTO reports (
        incident_date, incident_time, station, direction, category,
        delay_minutes, description, reporter_name,
        tfl_status_severity, tfl_status_description, tfl_status_reason
    ) VALUES (
        p_incident_date, p_incident_time, p_station, p_direction, p_category,
        p_delay_minutes, p_description, COALESCE(NULLIF(p_reporter_name, ''), 'Anonymous'),
        p_tfl_status_severity, p_tfl_status_description, p_tfl_status_reason
    ) RETURNING id INTO new_id;

    -- Store ownership token
    IF p_owner_token IS NOT NULL AND p_owner_token != '' THEN
        INSERT INTO report_tokens (report_id, owner_token)
        VALUES (new_id, p_owner_token);
    END IF;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. RPC: Edit a report (requires matching ownership token)
CREATE OR REPLACE FUNCTION edit_report(
    p_report_id UUID,
    p_owner_token TEXT,
    p_incident_date DATE,
    p_incident_time TIME,
    p_station TEXT,
    p_direction TEXT,
    p_category TEXT,
    p_delay_minutes INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_reporter_name TEXT DEFAULT 'Anonymous'
) RETURNS VOID AS $$
BEGIN
    -- Verify ownership
    IF NOT EXISTS (
        SELECT 1 FROM report_tokens
        WHERE report_id = p_report_id AND owner_token = p_owner_token
    ) THEN
        RAISE EXCEPTION 'You do not have permission to edit this report';
    END IF;

    -- Validate delay
    IF p_delay_minutes IS NOT NULL AND (p_delay_minutes < 0 OR p_delay_minutes > 60) THEN
        RAISE EXCEPTION 'Delay must be between 0 and 60 minutes';
    END IF;

    -- Validate direction
    IF p_direction NOT IN (
        'Eastbound (towards Earls Court)', 'Westbound (towards Wimbledon)', 'Both / General'
    ) THEN
        RAISE EXCEPTION 'Invalid direction';
    END IF;

    -- Truncate long text fields
    IF p_description IS NOT NULL AND LENGTH(p_description) > 1000 THEN
        p_description := LEFT(p_description, 1000);
    END IF;
    IF p_reporter_name IS NOT NULL AND LENGTH(p_reporter_name) > 100 THEN
        p_reporter_name := LEFT(p_reporter_name, 100);
    END IF;

    -- Update the report (does NOT touch upvotes or TfL status fields)
    UPDATE reports SET
        incident_date = p_incident_date,
        incident_time = p_incident_time,
        station = p_station,
        direction = p_direction,
        category = p_category,
        delay_minutes = p_delay_minutes,
        description = p_description,
        reporter_name = COALESCE(NULLIF(p_reporter_name, ''), 'Anonymous')
    WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. RPC: Delete a report (requires matching ownership token)
CREATE OR REPLACE FUNCTION delete_report(
    p_report_id UUID,
    p_owner_token TEXT
) RETURNS VOID AS $$
BEGIN
    -- Verify ownership
    IF NOT EXISTS (
        SELECT 1 FROM report_tokens
        WHERE report_id = p_report_id AND owner_token = p_owner_token
    ) THEN
        RAISE EXCEPTION 'You do not have permission to delete this report';
    END IF;

    -- Delete the report (report_tokens row cascades)
    DELETE FROM reports WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Database-level constraints (belt and suspenders)
DO $$
BEGIN
    ALTER TABLE reports ADD CONSTRAINT chk_delay_range
        CHECK (delay_minutes IS NULL OR (delay_minutes >= 0 AND delay_minutes <= 60));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE reports ADD CONSTRAINT chk_upvotes_positive
        CHECK (upvotes >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
