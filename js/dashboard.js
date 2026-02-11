/*
 * District Line Tracker - dashboard.js
 * Dashboard with CSS bar charts, time-lost breakdowns, day/time patterns,
 * and TfL discrepancy analysis. Vanilla JS, no chart libraries.
 */

var STATIONS_ORDER = [
    "Wimbledon", "Wimbledon Park", "Southfields", "East Putney",
    "Putney Bridge", "Parsons Green", "Fulham Broadway", "West Brompton", "Earls Court"
];

var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

var TIME_BANDS = [
    { label: "06–08", min: 6, max: 8 },
    { label: "08–10", min: 8, max: 10 },
    { label: "10–12", min: 10, max: 12 },
    { label: "12–14", min: 12, max: 14 },
    { label: "14–16", min: 14, max: 16 },
    { label: "16–18", min: 16, max: 18 },
    { label: "18–20", min: 18, max: 20 },
    { label: "20–22", min: 20, max: 22 }
];

function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatHours(totalMinutes) {
    if (totalMinutes < 60) return totalMinutes + " min";
    var hrs = Math.floor(totalMinutes / 60);
    var mins = Math.round(totalMinutes % 60);
    if (mins === 0) return hrs + " hr" + (hrs > 1 ? "s" : "");
    return hrs + " hr" + (hrs > 1 ? "s" : "") + " " + mins + " min";
}

function getWeekKey(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var dayOfWeek = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayOfWeek);
    var yearStart = new Date(d.getFullYear(), 0, 1);
    var weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    var monday = new Date(dateStr + "T00:00:00");
    var dow = monday.getDay() || 7;
    monday.setDate(monday.getDate() - dow + 1);
    return monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getMonthKey(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function getHourFromTime(timeStr) {
    if (!timeStr) return -1;
    var parts = timeStr.split(":");
    return parseInt(parts[0], 10);
}

function renderBarChart(containerId, data, colorClass) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 16px;">No data yet</p>';
        return;
    }

    var maxVal = Math.max.apply(null, data.map(function (d) { return d.value; }));
    if (maxVal === 0) maxVal = 1;

    var html = "";
    for (var i = 0; i < data.length; i++) {
        var pct = (data[i].value / maxVal * 100).toFixed(1);
        var barColor = colorClass || "green";
        if (data[i].color) barColor = data[i].color;

        html +=
            '<div class="bar-row">' +
                '<div class="bar-label">' + escapeHtml(data[i].label) + '</div>' +
                '<div class="bar-track">' +
                    '<div class="bar-fill ' + barColor + '" style="width: ' + pct + '%"></div>' +
                '</div>' +
                '<div class="bar-value">' + data[i].display + '</div>' +
            '</div>';
    }

    container.innerHTML = html;
}


/* ---- Dual-row bar chart (reports + time lost side by side) ---- */

function renderDualBarChart(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 16px;">No data yet</p>';
        return;
    }

    var maxReports = Math.max.apply(null, data.map(function (d) { return d.reports; }));
    var maxTimeLost = Math.max.apply(null, data.map(function (d) { return d.timeLost; }));
    if (maxReports === 0) maxReports = 1;
    if (maxTimeLost === 0) maxTimeLost = 1;

    var html = '<div style="display: flex; gap: 6px; margin-bottom: 10px; font-size: 11px; color: var(--text-muted);">' +
        '<span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; border-radius: 3px; background: var(--district-green); display: inline-block;"></span> Reports</span>' +
        '<span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; border-radius: 3px; background: var(--red); display: inline-block;"></span> Time lost</span>' +
    '</div>';

    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        var reportPct = (d.reports / maxReports * 100).toFixed(1);
        var timePct = (d.timeLost / maxTimeLost * 100).toFixed(1);

        html +=
            '<div style="margin-bottom: 12px;">' +
                '<div style="font-size: 12px; font-weight: 700; margin-bottom: 4px; color: var(--text);">' + escapeHtml(d.label) + '</div>' +
                '<div class="bar-row" style="margin-bottom: 2px;">' +
                    '<div class="bar-track">' +
                        '<div class="bar-fill green" style="width: ' + reportPct + '%"></div>' +
                    '</div>' +
                    '<div class="bar-value">' + d.reports + '</div>' +
                '</div>' +
                '<div class="bar-row">' +
                    '<div class="bar-track">' +
                        '<div class="bar-fill red" style="width: ' + timePct + '%"></div>' +
                    '</div>' +
                    '<div class="bar-value">' + formatHours(d.timeLost) + '</div>' +
                '</div>' +
            '</div>';
    }

    container.innerHTML = html;
}


/* ---- Load all dashboard data ---- */

function loadDashboard() {
    supabaseSelect("reports", "order=incident_date.desc")
        .then(function (reports) {
            if (reports.length === 0) {
                document.getElementById("stats-grid").innerHTML =
                    '<div style="grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--text-muted);">' +
                    '<p>No reports yet. <a href="index.html" style="color: var(--district-green); font-weight: 600;">Submit one</a> to get started.</p></div>';
                return;
            }

            buildTimeLostHero(reports);
            buildStatsGrid(reports);
            buildWeeklyChart(reports);
            buildMonthlyChart(reports);
            buildDayOfWeekChart(reports);
            buildTimeOfDayChart(reports);
            buildStationChart(reports);
            buildCategoryChart(reports);
            buildDiscrepancyStats(reports);
        })
        .catch(function () {
            document.getElementById("stats-grid").innerHTML =
                '<div style="grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--text-muted);"><p>Could not load data.</p></div>';
        });
}


function buildTimeLostHero(reports) {
    var heroEl = document.getElementById("time-lost-hero");
    if (!heroEl) return;

    var totalMinutes = 0;
    var thisWeekMinutes = 0;
    var thisMonthMinutes = 0;
    var now = new Date();
    var weekAgo = new Date(now - 7 * 86400000);
    var monthAgo = new Date(now - 30 * 86400000);

    for (var i = 0; i < reports.length; i++) {
        var r = reports[i];
        if (!r.delay_minutes || r.delay_minutes <= 0) continue;
        var people = 1 + (r.upvotes || 0);
        var mins = r.delay_minutes * people;
        totalMinutes += mins;
        var d = new Date(r.incident_date + "T00:00:00");
        if (d >= weekAgo) thisWeekMinutes += mins;
        if (d >= monthAgo) thisMonthMinutes += mins;
    }

    heroEl.innerHTML =
        '<div class="big-number">' + formatHours(totalMinutes) + '</div>' +
        '<div class="big-label">' +
            'total commuter time lost' +
            '<button class="info-btn" onclick="showInfoModal()" title="How is this calculated?">?</button>' +
        '</div>' +
        '<div class="sub-stats">' +
            '<div><div class="sub-stat-value">' + formatHours(thisWeekMinutes) + '</div><div class="sub-stat-label">this week</div></div>' +
            '<div><div class="sub-stat-value">' + formatHours(thisMonthMinutes) + '</div><div class="sub-stat-label">this month</div></div>' +
            '<div><div class="sub-stat-value">' + reports.length + '</div><div class="sub-stat-label">reports</div></div>' +
        '</div>';
}


function buildStatsGrid(reports) {
    var totalReports = reports.length;
    var delayReports = reports.filter(function (r) { return r.delay_minutes > 0; });
    var avgDelay = delayReports.length > 0
        ? Math.round(delayReports.reduce(function (s, r) { return s + r.delay_minutes; }, 0) / delayReports.length)
        : 0;
    var maxDelay = delayReports.length > 0
        ? Math.max.apply(null, delayReports.map(function (r) { return r.delay_minutes; }))
        : 0;

    var discrepancies = reports.filter(function (r) {
        return r.tfl_status_severity >= 10 && r.delay_minutes && r.delay_minutes > 0;
    }).length;

    var grid = document.getElementById("stats-grid");
    grid.innerHTML =
        '<div class="stat-card"><div class="stat-value">' + totalReports + '</div><div class="stat-label">Total Reports</div></div>' +
        '<div class="stat-card"><div class="stat-value ' + (avgDelay > 15 ? 'danger' : avgDelay > 8 ? 'warn' : '') + '">' + avgDelay + ' min</div><div class="stat-label">Avg Delay</div></div>' +
        '<div class="stat-card"><div class="stat-value danger">' + maxDelay + ' min</div><div class="stat-label">Worst Delay</div></div>' +
        '<div class="stat-card"><div class="stat-value warn">' + discrepancies + '</div><div class="stat-label">TfL Discrepancies</div></div>';
}


function buildWeeklyChart(reports) {
    var weekMap = {};
    var weekOrder = [];

    for (var i = 0; i < reports.length; i++) {
        var r = reports[i];
        if (!r.delay_minutes || r.delay_minutes <= 0) continue;
        var key = getWeekKey(r.incident_date);
        var people = 1 + (r.upvotes || 0);
        if (!weekMap[key]) {
            weekMap[key] = 0;
            weekOrder.push(key);
        }
        weekMap[key] += r.delay_minutes * people;
    }

    weekOrder.reverse();

    var data = weekOrder.map(function (k) {
        return { label: "w/c " + k, value: weekMap[k], display: formatHours(weekMap[k]), color: "red" };
    });

    renderBarChart("weekly-chart", data);
}


function buildMonthlyChart(reports) {
    var monthMap = {};
    var monthOrder = [];

    for (var i = 0; i < reports.length; i++) {
        var r = reports[i];
        if (!r.delay_minutes || r.delay_minutes <= 0) continue;
        var key = getMonthKey(r.incident_date);
        var people = 1 + (r.upvotes || 0);
        if (!monthMap[key]) {
            monthMap[key] = 0;
            monthOrder.push(key);
        }
        monthMap[key] += r.delay_minutes * people;
    }

    monthOrder.reverse();

    var data = monthOrder.map(function (k) {
        return { label: k, value: monthMap[k], display: formatHours(monthMap[k]), color: "red" };
    });

    renderBarChart("monthly-chart", data);
}


/* ---- Day of week chart (dual: reports + time lost) ---- */

function buildDayOfWeekChart(reports) {
    // Build arrays for Mon-Sun (reorder so Mon is first)
    var dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 through Sun=0
    var dayReports = {};
    var dayTimeLost = {};

    for (var i = 0; i < 7; i++) {
        dayReports[i] = 0;
        dayTimeLost[i] = 0;
    }

    for (var j = 0; j < reports.length; j++) {
        var r = reports[j];
        var d = new Date(r.incident_date + "T00:00:00");
        var dow = d.getDay(); // 0=Sun, 1=Mon, ...
        dayReports[dow]++;

        if (r.delay_minutes && r.delay_minutes > 0) {
            var people = 1 + (r.upvotes || 0);
            dayTimeLost[dow] += r.delay_minutes * people;
        }
    }

    var data = dayOrder.map(function (dow) {
        return {
            label: DAY_NAMES[dow],
            reports: dayReports[dow],
            timeLost: dayTimeLost[dow]
        };
    });

    renderDualBarChart("day-of-week-chart", data);
}


/* ---- Time of day chart (dual: reports + time lost) ---- */

function buildTimeOfDayChart(reports) {
    var bandReports = {};
    var bandTimeLost = {};

    for (var i = 0; i < TIME_BANDS.length; i++) {
        bandReports[i] = 0;
        bandTimeLost[i] = 0;
    }

    for (var j = 0; j < reports.length; j++) {
        var r = reports[j];
        var hour = getHourFromTime(r.incident_time);
        if (hour < 0) continue;

        // Find which band this falls into
        for (var b = 0; b < TIME_BANDS.length; b++) {
            if (hour >= TIME_BANDS[b].min && hour < TIME_BANDS[b].max) {
                bandReports[b]++;
                if (r.delay_minutes && r.delay_minutes > 0) {
                    var people = 1 + (r.upvotes || 0);
                    bandTimeLost[b] += r.delay_minutes * people;
                }
                break;
            }
        }
    }

    var data = [];
    for (var k = 0; k < TIME_BANDS.length; k++) {
        data.push({
            label: TIME_BANDS[k].label,
            reports: bandReports[k],
            timeLost: bandTimeLost[k]
        });
    }

    renderDualBarChart("time-of-day-chart", data);
}


function buildStationChart(reports) {
    var stationMap = {};
    for (var i = 0; i < reports.length; i++) {
        var s = reports[i].station;
        stationMap[s] = (stationMap[s] || 0) + 1;
    }

    var data = STATIONS_ORDER.map(function (s) {
        var count = stationMap[s] || 0;
        var color = count > 5 ? "red" : count > 2 ? "amber" : "green";
        return { label: s, value: count, display: count + "", color: color };
    });

    renderBarChart("station-chart", data);
}


function buildCategoryChart(reports) {
    var catMap = {};
    for (var i = 0; i < reports.length; i++) {
        var c = reports[i].category;
        catMap[c] = (catMap[c] || 0) + 1;
    }

    var cats = Object.keys(catMap).sort(function (a, b) { return catMap[b] - catMap[a]; });

    var colors = ["red", "amber", "green", "amber", "red", "green", "amber", "red", "green"];
    var data = cats.map(function (c, i) {
        return { label: c, value: catMap[c], display: catMap[c] + "", color: colors[i % colors.length] };
    });

    renderBarChart("category-chart", data);
}


function buildDiscrepancyStats(reports) {
    var container = document.getElementById("discrepancy-stats");
    if (!container) return;

    var withDelay = reports.filter(function (r) { return r.delay_minutes && r.delay_minutes > 0; });
    var goodServiceDuringDelay = withDelay.filter(function (r) { return r.tfl_status_severity >= 10; });
    var pct = withDelay.length > 0 ? Math.round(goodServiceDuringDelay.length / withDelay.length * 100) : 0;

    var barColor = pct > 60 ? "red" : pct > 30 ? "amber" : "green";

    container.innerHTML =
        '<p style="font-size: 14px; margin-bottom: 12px; color: var(--text);">' +
            'Of <strong>' + withDelay.length + '</strong> reports where a delay was experienced, ' +
            '<strong style="color: var(--red);">' + goodServiceDuringDelay.length + ' (' + pct + '%)</strong> ' +
            'were submitted while TfL officially reported "Good Service" on the District line.' +
        '</p>' +
        '<div class="bar-chart">' +
            '<div class="bar-row">' +
                '<div class="bar-label">Mismatch</div>' +
                '<div class="bar-track">' +
                    '<div class="bar-fill ' + barColor + '" style="width: ' + pct + '%"></div>' +
                '</div>' +
                '<div class="bar-value">' + pct + '%</div>' +
            '</div>' +
        '</div>' +
        '<p style="font-size: 12px; color: var(--text-muted); margin-top: 12px;">' +
            'This means TfL\'s status page was misleading for ' + pct + '% of reported delays. ' +
            'This data is shared with your local MP to push for accurate status reporting and service investment.' +
        '</p>';
}


/* ---- Toggle patterns section ---- */

var patternsVisible = false;

function togglePatterns() {
    var container = document.getElementById("patterns-container");
    var btn = document.getElementById("toggle-patterns-btn");
    if (!container || !btn) return;

    patternsVisible = !patternsVisible;

    if (patternsVisible) {
        container.style.display = "block";
        btn.textContent = "Hide reporting patterns ▲";
    } else {
        container.style.display = "none";
        btn.textContent = "Show reporting patterns ▼";
    }
}


/* ---- Init ---- */
loadDashboard();
