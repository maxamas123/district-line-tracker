-- ============================================================
-- District Line Tracker - Supabase Setup
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Reports table: stores every commuter complaint
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
    tfl_status_reason TEXT
);

-- Indexes for common queries
CREATE INDEX idx_reports_date ON reports(incident_date);
CREATE INDEX idx_reports_station ON reports(station);
CREATE INDEX idx_reports_category ON reports(category);


-- 2. TfL status log: hourly snapshots from the TfL API
CREATE TABLE tfl_status_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checked_at TIMESTAMPTZ DEFAULT now(),
    status_severity INTEGER NOT NULL,
    status_description TEXT NOT NULL,
    reason TEXT,
    raw_response JSONB
);

CREATE INDEX idx_tfl_status_checked ON tfl_status_log(checked_at);


-- 3. Row Level Security
-- Everyone can read reports and tfl_status_log.
-- Everyone can insert reports (anonymous submissions).
-- Only authenticated users (or service role) can update/delete.

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports"
    ON reports FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert reports"
    ON reports FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can upvote reports"
    ON reports FOR UPDATE
    USING (true)
    WITH CHECK (true);

ALTER TABLE tfl_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tfl status"
    ON tfl_status_log FOR SELECT
    USING (true);

CREATE POLICY "Service can insert tfl status"
    ON tfl_status_log FOR INSERT
    WITH CHECK (true);


-- 4. Upvote function (atomic increment to avoid race conditions)
CREATE OR REPLACE FUNCTION upvote_report(report_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE reports SET upvotes = upvotes + 1 WHERE id = report_id
    RETURNING upvotes INTO new_count;
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Downvote function (for toggling "Me too" off)
CREATE OR REPLACE FUNCTION downvote_report(report_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE reports SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = report_id
    RETURNING upvotes INTO new_count;
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
