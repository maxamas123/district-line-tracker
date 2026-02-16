-- ============================================================
-- Fix The District - Supabase Setup
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Reports table: stores every delay report
CREATE TABLE reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    incident_date DATE NOT NULL,
    incident_time TIME NOT NULL,
    station TEXT NOT NULL,
    direction TEXT NOT NULL,
    category TEXT NOT NULL,
    delay_minutes INTEGER,
    description TEXT,
    reporter_name TEXT DEFAULT 'Anonymous',
    upvotes INTEGER DEFAULT 0,

    -- TfL official status captured at the moment of report
    tfl_status_severity INTEGER,
    tfl_status_description TEXT,
    tfl_status_reason TEXT,

    -- Constraints
    CONSTRAINT chk_delay_range CHECK (delay_minutes IS NULL OR (delay_minutes >= 0 AND delay_minutes <= 60)),
    CONSTRAINT chk_upvotes_positive CHECK (upvotes >= 0)
);

-- Indexes for common queries
CREATE INDEX idx_reports_date ON reports(incident_date);
CREATE INDEX idx_reports_station ON reports(station);
CREATE INDEX idx_reports_category ON reports(category);


-- 2. Report ownership tokens
-- Each report gets a random token on creation, stored here.
-- The anon role cannot read this table (no SELECT policy).
-- All access goes through SECURITY DEFINER functions.
CREATE TABLE report_tokens (
    report_id UUID PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
    owner_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE report_tokens ENABLE ROW LEVEL SECURITY;
-- No policies = anon cannot SELECT, INSERT, UPDATE, or DELETE


-- 3. TfL status log: snapshots from the TfL API (every 15 mins)
CREATE TABLE tfl_status_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checked_at TIMESTAMPTZ DEFAULT now(),
    status_severity INTEGER NOT NULL,
    status_description TEXT NOT NULL,
    reason TEXT,
    raw_response JSONB
);

CREATE INDEX idx_tfl_status_checked ON tfl_status_log(checked_at);


-- 4. Row Level Security
-- Reports: anyone can read, all writes go through RPC functions.
-- tfl_status_log: anyone can read, only service_role can write.

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports"
    ON reports FOR SELECT
    USING (true);

-- No INSERT, UPDATE, or DELETE policies for reports.
-- All modifications go through SECURITY DEFINER functions below.

ALTER TABLE tfl_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tfl status"
    ON tfl_status_log FOR SELECT
    USING (true);

-- No INSERT policy for tfl_status_log.
-- The service_role key (used by the cron function) bypasses RLS.


-- 5. RPC: Create a report (with ownership token + server-side validation)
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


-- 6. RPC: Edit a report (requires matching ownership token)
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


-- 7. RPC: Delete a report (requires matching ownership token)
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


-- 8. Vote tracking table
-- Prevents the same voter_id from upvoting a report more than once.
-- voter_id is a hash sent by the client (e.g. a random ID stored in localStorage).
CREATE TABLE IF NOT EXISTS vote_log (
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    voter_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (report_id, voter_id)
);

ALTER TABLE vote_log ENABLE ROW LEVEL SECURITY;
-- No policies = anon cannot read/write directly. All via SECURITY DEFINER RPCs.


-- 9. RPC: Upvote (with server-side dedup via voter_id)
CREATE OR REPLACE FUNCTION upvote_report(report_id UUID, p_voter_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    -- If voter_id provided, check for duplicate vote
    IF p_voter_id IS NOT NULL AND p_voter_id != '' THEN
        IF EXISTS (
            SELECT 1 FROM vote_log
            WHERE vote_log.report_id = upvote_report.report_id
              AND vote_log.voter_id = p_voter_id
        ) THEN
            -- Already voted — return current count without incrementing
            SELECT upvotes INTO new_count FROM reports WHERE id = upvote_report.report_id;
            RETURN COALESCE(new_count, 0);
        END IF;

        -- Record the vote
        INSERT INTO vote_log (report_id, voter_id)
        VALUES (upvote_report.report_id, p_voter_id);
    END IF;

    -- Cap upvotes at 200 to prevent abuse
    UPDATE reports SET upvotes = LEAST(upvotes + 1, 200)
    WHERE id = upvote_report.report_id
    RETURNING upvotes INTO new_count;
    RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. RPC: Downvote (with server-side dedup cleanup)
CREATE OR REPLACE FUNCTION downvote_report(report_id UUID, p_voter_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    -- Remove vote record if voter_id provided
    IF p_voter_id IS NOT NULL AND p_voter_id != '' THEN
        DELETE FROM vote_log
        WHERE vote_log.report_id = downvote_report.report_id
          AND vote_log.voter_id = p_voter_id;
    END IF;

    UPDATE reports SET upvotes = GREATEST(upvotes - 1, 0)
    WHERE id = downvote_report.report_id
    RETURNING upvotes INTO new_count;
    RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. RPC: Log TfL status (with server-side validation + dedup)
-- Called by the client to supplement the cron job. Validates
-- severity range and enforces a 14-minute dedup window so the
-- table can't be spammed.
CREATE OR REPLACE FUNCTION log_tfl_status(
    p_status_severity INTEGER,
    p_status_description TEXT,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Validate severity (TfL uses 0-10 range)
    IF p_status_severity IS NULL OR p_status_severity < 0 OR p_status_severity > 20 THEN
        RAISE EXCEPTION 'Invalid status severity';
    END IF;

    -- Validate description is not empty
    IF p_status_description IS NULL OR LENGTH(TRIM(p_status_description)) = 0 THEN
        RAISE EXCEPTION 'Status description is required';
    END IF;

    -- Truncate long fields to prevent abuse
    IF LENGTH(p_status_description) > 200 THEN
        p_status_description := LEFT(p_status_description, 200);
    END IF;
    IF p_reason IS NOT NULL AND LENGTH(p_reason) > 1000 THEN
        p_reason := LEFT(p_reason, 1000);
    END IF;

    -- Dedup: skip if there's already an entry within the last 14 minutes
    IF EXISTS (
        SELECT 1 FROM tfl_status_log
        WHERE checked_at >= (now() - interval '14 minutes')
        LIMIT 1
    ) THEN
        RETURN; -- Silently skip — not an error
    END IF;

    INSERT INTO tfl_status_log (status_severity, status_description, reason)
    VALUES (p_status_severity, p_status_description, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
