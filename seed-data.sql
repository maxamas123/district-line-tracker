-- ============================================================
-- Seed data from real Wimbledon branch WhatsApp group reports
-- Run this AFTER supabase-setup.sql
-- ============================================================

INSERT INTO reports (incident_date, incident_time, station, direction, category, delay_minutes, description, reporter_name, upvotes, tfl_status_severity, tfl_status_description) VALUES

-- Based on real commuter complaints, Feb 2026
('2026-02-09', '08:15', 'Wimbledon', 'Eastbound (towards City)', 'Reduced Service', 20,
 'Severe delays with less than half of the scheduled trains running into the City this morning, with the station now packed. Seems that TfL has given up on running anything resembling a regular service.',
 'Commuter', 4, 10, 'Good Service'),

('2026-02-09', '08:25', 'Wimbledon Park', 'Eastbound (towards City)', 'General Delays', 10,
 'Not just city trains — any train going through Wimbledon Park. Have to wait about 8-10 minutes for one when we know there''s space for 3 of them to wait at Wimbledon station.',
 'Regular commuter', 3, 10, 'Good Service'),

('2026-02-09', '08:30', 'Southfields', 'Eastbound (towards City)', 'Overcrowding', 10,
 'Standing room only after one stop, must be even worse for anyone further along the line. No room for anyone to get on at Southfields.',
 'Anonymous', 5, 10, 'Good Service'),

('2026-02-09', '08:40', 'Wimbledon Park', 'Eastbound (towards City)', 'No Announcements / Poor Comms', 15,
 'By the time the next one comes at WP, I''ll have been here for 15 minutes, and the station here is really busy. There hasn''t been any announcements. It''s not a good way to start the day.',
 'WP commuter', 6, 10, 'Good Service'),

('2026-02-08', '08:50', 'Earls Court', 'Eastbound (towards City)', 'General Delays', 20,
 'Just waited at Victoria for 20 mins and now having to find alternative route.',
 'Anonymous', 3, 10, 'Good Service'),

('2026-02-07', '07:45', 'Southfields', 'Eastbound (towards City)', 'General Delays', 12,
 'Does anyone know if District running ok from Southfields atm? Update: been waiting 12 minutes now, no trains.',
 'Local resident', 2, 9, 'General Delays'),

('2026-02-07', '17:30', 'East Putney', 'Westbound (towards Wimbledon)', 'Signal Failure', 15,
 'Crawling between East Putney and Southfields yet again. This was supposed to have been fixed after last year''s months-long signalling issues.',
 'Evening commuter', 4, 10, 'Good Service'),

('2026-02-06', '08:00', 'Wimbledon', 'Eastbound (towards City)', 'Reduced Service', 18,
 'Three scheduled trains in a row didn''t show. Platform dangerously overcrowded. This is the third time this week.',
 'Daily commuter', 7, 10, 'Good Service'),

('2026-02-06', '08:20', 'Putney Bridge', 'Eastbound (towards City)', 'General Delays', 18,
 'Three trains in a row cancelled. Platform announcements just say "good service on the District line" which is obviously wrong.',
 'Frustrated', 3, 10, 'Good Service'),

('2026-02-05', '07:50', 'Wimbledon Park', 'Eastbound (towards City)', 'General Delays', 12,
 'Another morning, another long wait at WP. 12 minutes between trains on what should be a 3-minute frequency.',
 'Anonymous', 2, 10, 'Good Service'),

('2026-02-05', '18:00', 'Parsons Green', 'Westbound (towards Wimbledon)', 'Overcrowding', 5,
 'Evening commute. Two trains went through too full to board. Eventually squeezed on the third.',
 'Evening commuter', 2, 10, 'Good Service'),

('2026-02-04', '08:10', 'Fulham Broadway', 'Eastbound (towards City)', 'General Delays', 7,
 'Train held at Fulham Broadway for several minutes with no explanation. Makes you late for work even on a "normal" day.',
 'Anonymous', 1, 10, 'Good Service'),

('2026-02-04', '08:35', 'Wimbledon', 'Eastbound (towards City)', 'General Delays', 25,
 'Absolute chaos at Wimbledon this morning. 25 minute wait, platform dangerously overcrowded, and when a train finally came it was already packed.',
 'Fed up', 8, 10, 'Good Service'),

('2026-02-03', '08:05', 'West Brompton', 'Eastbound (towards City)', 'Train Cancellation', 15,
 'Watched two trains terminated at Earls Court that should have continued. Had to wait 15 mins for one that actually ran through.',
 'Commuter', 2, 10, 'Good Service'),

('2026-02-03', '17:45', 'East Putney', 'Eastbound (towards City)', 'Signal Failure', 10,
 'Signal problems between East Putney and Southfields AGAIN. Thought the months of slow running last year was supposed to fix this.',
 'Resident', 3, 6, 'General Delays');
