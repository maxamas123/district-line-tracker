/*
 * District Line Tracker - demo-data.js
 * Realistic dummy data for demo mode. Toggle on from Feed or Dashboard.
 * Patterns: heavier weekday/peak reporting, realistic delays, TfL discrepancies.
 */

/* ---- Demo mode helpers ---- */

function isDemoMode() {
    return localStorage.getItem("dlt_demo_mode") === "true";
}

function toggleDemoMode() {
    var isOn = isDemoMode();
    localStorage.setItem("dlt_demo_mode", isOn ? "false" : "true");
    location.reload();
}

function initDemoToggle() {
    var checkbox = document.getElementById("demo-toggle");
    if (checkbox) checkbox.checked = isDemoMode();
    var banner = document.getElementById("demo-banner");
    if (banner) banner.style.display = isDemoMode() ? "block" : "none";
}


/* ---- Dummy reports ---- */

var DEMO_REPORTS = [
    // === Week of 5 Jan (Mon-Fri) ===
    { id: "demo-001", incident_date: "2026-01-05", incident_time: "07:35", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 8, description: "Waited 8 minutes for a District line train, platform very crowded by the time it arrived", reporter_name: "Sarah K", upvotes: 4, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-002", incident_date: "2026-01-05", incident_time: "08:12", station: "Southfields", direction: "Eastbound (towards Earls Court)", category: "Overcrowding", delay_minutes: 5, description: "First train too packed to board, had to wait for the next one", reporter_name: "James M", upvotes: 6, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-003", incident_date: "2026-01-05", incident_time: "17:48", station: "Earls Court", direction: "Westbound (towards Wimbledon)", category: "Signal Failure", delay_minutes: 12, description: "Signal failure at Earls Court, trains held at platform for 12 minutes", reporter_name: "Anonymous", upvotes: 8, tfl_status_severity: 9, tfl_status_description: "Minor Delays", tfl_status_reason: "Signal failure at Earls Court" },

    // Tuesday 6 Jan
    { id: "demo-004", incident_date: "2026-01-06", incident_time: "07:52", station: "Putney Bridge", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 6, description: "6 min wait, no information on boards", reporter_name: "Lucy P", upvotes: 3, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-005", incident_date: "2026-01-06", incident_time: "08:30", station: "Wimbledon Park", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 7, description: "Train terminated at Wimbledon Park, had to get off and wait for next one", reporter_name: "Tom W", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-006", incident_date: "2026-01-06", incident_time: "17:15", station: "Fulham Broadway", direction: "Westbound (towards Wimbledon)", category: "Reduced Service", delay_minutes: 10, description: "Only every other train running to Wimbledon, massive gaps in service", reporter_name: "Rachel H", upvotes: 5, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Wednesday 7 Jan
    { id: "demo-007", incident_date: "2026-01-07", incident_time: "08:05", station: "East Putney", direction: "Eastbound (towards Earls Court)", category: "Overcrowding", delay_minutes: 4, description: "Platform dangerously overcrowded, train arrived already full", reporter_name: "David S", upvotes: 3, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-008", incident_date: "2026-01-07", incident_time: "18:10", station: "Parsons Green", direction: "Westbound (towards Wimbledon)", category: "General Delays", delay_minutes: 7, description: "Board said 1 min but train didn't arrive for another 7 minutes", reporter_name: "Emma T", upvotes: 1, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Thursday 8 Jan
    { id: "demo-009", incident_date: "2026-01-08", incident_time: "07:28", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "Train Cancellation", delay_minutes: 15, description: "Two trains cancelled in a row, 15 minute wait. No announcements at all.", reporter_name: "Mark B", upvotes: 7, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-010", incident_date: "2026-01-08", incident_time: "08:40", station: "Southfields", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 5, description: "5 min gaps between trains, should be every 3", reporter_name: "Anna C", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-011", incident_date: "2026-01-08", incident_time: "17:35", station: "West Brompton", direction: "Westbound (towards Wimbledon)", category: "Signal Failure", delay_minutes: 18, description: "Stuck between stations for 10 mins due to signal failure, then crawled to West Brompton", reporter_name: "Chris L", upvotes: 5, tfl_status_severity: 6, tfl_status_description: "Severe Delays", tfl_status_reason: "Signal failure between Earls Court and West Brompton" },

    // Friday 9 Jan
    { id: "demo-012", incident_date: "2026-01-09", incident_time: "07:55", station: "Putney Bridge", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 6, description: "Running late again, 6 min wait in the cold", reporter_name: "Helen R", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-013", incident_date: "2026-01-09", incident_time: "16:45", station: "Earls Court", direction: "Westbound (towards Wimbledon)", category: "Reduced Service", delay_minutes: 8, description: "Half the Wimbledon trains seem to have been cut, huge wait", reporter_name: "Mike D", upvotes: 4, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Saturday 10 Jan
    { id: "demo-014", incident_date: "2026-01-10", incident_time: "11:20", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 10, description: "Weekend service worse than usual, 10 min wait", reporter_name: "Anonymous", upvotes: 1, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // === Week of 12 Jan ===
    { id: "demo-015", incident_date: "2026-01-12", incident_time: "07:40", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 9, description: "Monday morning delays again. 9 min wait, two trains went straight through without stopping", reporter_name: "Sophie G", upvotes: 5, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-016", incident_date: "2026-01-12", incident_time: "08:15", station: "East Putney", direction: "Eastbound (towards Earls Court)", category: "No Announcements / Poor Comms", delay_minutes: 7, description: "No info on departure boards, just blank screens for 7 mins", reporter_name: "Paul F", upvotes: 3, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-017", incident_date: "2026-01-12", incident_time: "17:25", station: "Parsons Green", direction: "Westbound (towards Wimbledon)", category: "Overcrowding", delay_minutes: 5, description: "Couldn't get on the first train, absolutely rammed", reporter_name: "Katie N", upvotes: 4, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-018", incident_date: "2026-01-12", incident_time: "18:05", station: "Fulham Broadway", direction: "Westbound (towards Wimbledon)", category: "General Delays", delay_minutes: 6, description: "Platform packed, waited ages for a Wimbledon train", reporter_name: "Ben A", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Tuesday 13 Jan
    { id: "demo-019", incident_date: "2026-01-13", incident_time: "07:50", station: "Southfields", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 5, description: "Running 5 mins late, every single day this week", reporter_name: "Laura J", upvotes: 3, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-020", incident_date: "2026-01-13", incident_time: "17:50", station: "Earls Court", direction: "Westbound (towards Wimbledon)", category: "Train Cancellation", delay_minutes: 12, description: "Wimbledon train cancelled, had to wait for the next one \u2014 12 mins", reporter_name: "Sam E", upvotes: 6, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Wednesday 14 Jan
    { id: "demo-021", incident_date: "2026-01-14", incident_time: "08:00", station: "Wimbledon Park", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 4, description: "Short delay, 4 min wait", reporter_name: "Olivia W", upvotes: 1, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-022", incident_date: "2026-01-14", incident_time: "12:30", station: "Putney Bridge", direction: "Both / General", category: "Safety Concern", delay_minutes: 3, description: "Person unwell on platform, no staff visible to help for several minutes", reporter_name: "Dan M", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Thursday 15 Jan
    { id: "demo-023", incident_date: "2026-01-15", incident_time: "07:30", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "Signal Failure", delay_minutes: 20, description: "Major signal failure, absolute chaos at Wimbledon. 20+ min delay, platform dangerously crowded", reporter_name: "Sarah K", upvotes: 9, tfl_status_severity: 6, tfl_status_description: "Severe Delays", tfl_status_reason: "Signal failure at Wimbledon" },
    { id: "demo-024", incident_date: "2026-01-15", incident_time: "08:20", station: "Southfields", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 12, description: "Still recovering from morning signal failure, 12 min gaps", reporter_name: "James M", upvotes: 4, tfl_status_severity: 9, tfl_status_description: "Minor Delays", tfl_status_reason: "Earlier signal failure" },
    { id: "demo-025", incident_date: "2026-01-15", incident_time: "17:40", station: "West Brompton", direction: "Westbound (towards Wimbledon)", category: "General Delays", delay_minutes: 8, description: "Still not recovered from this morning, 8 min wait at rush hour", reporter_name: "Rachel H", upvotes: 3, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-026", incident_date: "2026-01-15", incident_time: "18:30", station: "Putney Bridge", direction: "Westbound (towards Wimbledon)", category: "Overcrowding", delay_minutes: 6, description: "Had to let two trains go, both too full to board", reporter_name: "Anonymous", upvotes: 5, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Friday 16 Jan
    { id: "demo-027", incident_date: "2026-01-16", incident_time: "07:45", station: "East Putney", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 7, description: "Another Friday, another delay. 7 mins waiting", reporter_name: "Tom W", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-028", incident_date: "2026-01-16", incident_time: "17:55", station: "Fulham Broadway", direction: "Westbound (towards Wimbledon)", category: "General Delays", delay_minutes: 5, description: "Board showed 8 mins to next Wimbledon train. Unacceptable at rush hour.", reporter_name: "Emma T", upvotes: 3, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Sunday 18 Jan
    { id: "demo-029", incident_date: "2026-01-18", incident_time: "14:15", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "Reduced Service", delay_minutes: 15, description: "Sunday service is appalling. 15 min wait, trains only every 12 mins", reporter_name: "Anonymous", upvotes: 1, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // === Week of 19 Jan ===
    { id: "demo-030", incident_date: "2026-01-19", incident_time: "07:38", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "Overcrowding", delay_minutes: 6, description: "Platform heaving at 7:38am, first train was standing room only before it even left Wimbledon", reporter_name: "Mark B", upvotes: 5, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-031", incident_date: "2026-01-19", incident_time: "08:10", station: "Parsons Green", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 5, description: "5 min delay, no explanation", reporter_name: "Anna C", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-032", incident_date: "2026-01-19", incident_time: "17:20", station: "Earls Court", direction: "Westbound (towards Wimbledon)", category: "Train Cancellation", delay_minutes: 10, description: "Board said 2 mins, then train was cancelled. Next one not for 10 mins.", reporter_name: "Chris L", upvotes: 4, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Tuesday 20 Jan
    { id: "demo-033", incident_date: "2026-01-20", incident_time: "07:55", station: "Putney Bridge", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 8, description: "8 minute wait at rush hour. Why is this acceptable?", reporter_name: "Helen R", upvotes: 4, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-034", incident_date: "2026-01-20", incident_time: "18:15", station: "Southfields", direction: "Westbound (towards Wimbledon)", category: "No Announcements / Poor Comms", delay_minutes: 6, description: "Waited 6 mins with zero information. Boards just said 'Check front of train'", reporter_name: "Sophie G", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Thursday 22 Jan
    { id: "demo-035", incident_date: "2026-01-22", incident_time: "07:42", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 10, description: "10 min wait. Getting ridiculous. Third time this week.", reporter_name: "Mike D", upvotes: 6, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-036", incident_date: "2026-01-22", incident_time: "17:30", station: "Fulham Broadway", direction: "Westbound (towards Wimbledon)", category: "Overcrowding", delay_minutes: 7, description: "Packed train, couldn't even get near the doors", reporter_name: "Katie N", upvotes: 3, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-037", incident_date: "2026-01-22", incident_time: "18:45", station: "Wimbledon Park", direction: "Westbound (towards Wimbledon)", category: "General Delays", delay_minutes: 5, description: "Short delay but annoying after a long day", reporter_name: "Ben A", upvotes: 1, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // === Week of 26 Jan ===
    { id: "demo-038", incident_date: "2026-01-26", incident_time: "07:35", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "Signal Failure", delay_minutes: 15, description: "Signal failure AGAIN. This is the third time this month. 15 min delay.", reporter_name: "Paul F", upvotes: 8, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-039", incident_date: "2026-01-26", incident_time: "08:25", station: "East Putney", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 8, description: "Knock-on from earlier signal failure, still 8 min gaps", reporter_name: "Laura J", upvotes: 3, tfl_status_severity: 9, tfl_status_description: "Minor Delays", tfl_status_reason: null },
    { id: "demo-040", incident_date: "2026-01-26", incident_time: "17:10", station: "Parsons Green", direction: "Westbound (towards Wimbledon)", category: "General Delays", delay_minutes: 6, description: "Evening rush, 6 min wait despite the morning chaos", reporter_name: "Olivia W", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Wednesday 28 Jan
    { id: "demo-041", incident_date: "2026-01-28", incident_time: "08:05", station: "Southfields", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 4, description: "Minor delay, 4 min wait", reporter_name: "Dan M", upvotes: 1, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-042", incident_date: "2026-01-28", incident_time: "18:30", station: "Earls Court", direction: "Westbound (towards Wimbledon)", category: "Reduced Service", delay_minutes: 10, description: "Only 1 Wimbledon train in 20 mins. Platform absolutely rammed.", reporter_name: "Sam E", upvotes: 5, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Thursday 29 Jan
    { id: "demo-043", incident_date: "2026-01-29", incident_time: "07:50", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 7, description: "7 min wait at rush hour, feels like Groundhog Day", reporter_name: "Sarah K", upvotes: 4, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-044", incident_date: "2026-01-29", incident_time: "17:45", station: "West Brompton", direction: "Westbound (towards Wimbledon)", category: "Train Cancellation", delay_minutes: 12, description: "Wimbledon train cancelled, next one not for 12 mins. Stood in the rain.", reporter_name: "James M", upvotes: 6, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Saturday 31 Jan
    { id: "demo-045", incident_date: "2026-01-31", incident_time: "13:40", station: "Fulham Broadway", direction: "Both / General", category: "Other", delay_minutes: 3, description: "Staff at ticket barriers very unhelpful about service changes this weekend", reporter_name: "Anonymous", upvotes: 0, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // === February ===
    { id: "demo-046", incident_date: "2026-02-02", incident_time: "07:40", station: "Wimbledon", direction: "Eastbound (towards Earls Court)", category: "General Delays", delay_minutes: 9, description: "New month, same old delays. 9 minutes late for work again.", reporter_name: "Lucy P", upvotes: 5, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-047", incident_date: "2026-02-02", incident_time: "08:20", station: "Wimbledon Park", direction: "Eastbound (towards Earls Court)", category: "Overcrowding", delay_minutes: 5, description: "Platform packed, had to let one train go", reporter_name: "David S", upvotes: 3, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-048", incident_date: "2026-02-02", incident_time: "17:30", station: "Earls Court", direction: "Westbound (towards Wimbledon)", category: "General Delays", delay_minutes: 8, description: "8 min wait for a Wimbledon train at 5:30pm. Madness.", reporter_name: "Rachel H", upvotes: 4, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },

    // Tuesday 3 Feb
    { id: "demo-049", incident_date: "2026-02-03", incident_time: "07:55", station: "Putney Bridge", direction: "Eastbound (towards Earls Court)", category: "Signal Failure", delay_minutes: 14, description: "Signal failure between Putney Bridge and Parsons Green. Stuck for 14 mins.", reporter_name: "Tom W", upvotes: 7, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null },
    { id: "demo-050", incident_date: "2026-02-03", incident_time: "18:00", station: "Southfields", direction: "Westbound (towards Wimbledon)", category: "General Delays", delay_minutes: 5, description: "5 min delay homeward bound", reporter_name: "Emma T", upvotes: 2, tfl_status_severity: 10, tfl_status_description: "Good Service", tfl_status_reason: null }
];
