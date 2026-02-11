/*
 * District Line Tracker - feed.js
 * Loads report feed with upvotes and time-lost tally.
 * Vanilla JS, no frameworks.
 */

var feedOffset = 0;
var FEED_PAGE_SIZE = 20;

function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function badgeClass(category, delayMins) {
    if (category === "Severe Delays" || delayMins >= 15) return "severe";
    if (category === "Minor Delays" || (delayMins && delayMins >= 5)) return "moderate";
    return "info";
}

function formatHours(totalMinutes) {
    if (totalMinutes < 60) return totalMinutes + " min";
    var hrs = Math.floor(totalMinutes / 60);
    var mins = Math.round(totalMinutes % 60);
    if (mins === 0) return hrs + " hr" + (hrs > 1 ? "s" : "");
    return hrs + " hr" + (hrs > 1 ? "s" : "") + " " + mins + " min";
}


/* ---- Time lost hero ---- */

function loadTimeLostHero() {
    var heroEl = document.getElementById("time-lost-hero");
    if (!heroEl) return;

    // Fetch all reports to calculate time lost
    supabaseSelect("reports", "select=delay_minutes,upvotes,incident_date&order=incident_date.desc")
        .then(function (reports) {
            var totalMinutes = 0;
            var thisWeekMinutes = 0;
            var thisMonthMinutes = 0;
            var totalReports = reports.length;
            var discrepancyCount = 0;

            var now = new Date();
            var weekAgo = new Date(now - 7 * 86400000);
            var monthAgo = new Date(now - 30 * 86400000);

            for (var i = 0; i < reports.length; i++) {
                var r = reports[i];
                if (!r.delay_minutes || r.delay_minutes <= 0) continue;

                // Time lost = delay * (1 reporter + upvotes)
                var peopleLost = 1 + (r.upvotes || 0);
                var minutesLost = r.delay_minutes * peopleLost;

                totalMinutes += minutesLost;

                var d = new Date(r.incident_date + "T00:00:00");
                if (d >= weekAgo) thisWeekMinutes += minutesLost;
                if (d >= monthAgo) thisMonthMinutes += minutesLost;
            }

            heroEl.innerHTML =
                '<div class="big-number">' + formatHours(totalMinutes) + '</div>' +
                '<div class="big-label">' +
                    'total commuter time lost' +
                    '<button class="info-btn" onclick="showInfoModal()" title="How is this calculated?">?</button>' +
                '</div>' +
                '<div class="sub-stats">' +
                    '<div>' +
                        '<div class="sub-stat-value">' + formatHours(thisWeekMinutes) + '</div>' +
                        '<div class="sub-stat-label">this week</div>' +
                    '</div>' +
                    '<div>' +
                        '<div class="sub-stat-value">' + formatHours(thisMonthMinutes) + '</div>' +
                        '<div class="sub-stat-label">this month</div>' +
                    '</div>' +
                    '<div>' +
                        '<div class="sub-stat-value">' + totalReports + '</div>' +
                        '<div class="sub-stat-label">reports</div>' +
                    '</div>' +
                '</div>';
        })
        .catch(function () {
            heroEl.innerHTML = '<div class="big-label">Could not load time-lost data</div>';
        });
}


/* ---- Render a single report ---- */

function renderReport(r) {
    var severity = badgeClass(r.category, r.delay_minutes);
    var borderColor =
        severity === "severe" ? "var(--red)" :
        severity === "moderate" ? "var(--amber)" : "var(--district-green)";

    var badgeBg =
        severity === "severe" ? "#FDECEA" :
        severity === "moderate" ? "#FFF3CD" : "#D1ECF1";
    var badgeColor =
        severity === "severe" ? "var(--red)" :
        severity === "moderate" ? "#856404" : "#0C5460";

    var discrepancy = "";
    if (r.tfl_status_severity >= 10 && r.delay_minutes && r.delay_minutes > 0) {
        discrepancy =
            '<div style="margin-top: 8px; padding: 6px 10px; background: #FFF3CD; border-radius: 6px; font-size: 12px; color: #856404;">' +
            'TfL said "Good Service" when this ' + r.delay_minutes + '-min delay was reported' +
            '</div>';
    }

    // Upvote button
    var voted = hasUpvoted(r.id);
    var upvoteClass = "upvote-btn" + (voted ? " voted" : "");
    var upvoteTitle = voted ? "You've already confirmed this" : "Tap if you experienced this too";
    var peopleLost = 1 + (r.upvotes || 0);
    var timeLostStr = r.delay_minutes ? formatHours(r.delay_minutes * peopleLost) + " lost" : "";

    var upvoteHtml =
        '<div style="display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap;">' +
            '<button class="' + upvoteClass + '" ' +
                'data-report-id="' + r.id + '" ' +
                'title="' + upvoteTitle + '"' +
                (voted ? ' disabled' : '') + '>' +
                '👍 Me too <span class="upvote-count">' + (r.upvotes || 0) + '</span>' +
            '</button>' +
            (timeLostStr ? '<span style="font-size: 12px; color: var(--text-muted);">' + peopleLost + ' people affected · ' + timeLostStr + '</span>' : '') +
        '</div>';

    return '<div class="card" style="border-left: 4px solid ' + borderColor + '; padding: 16px;" id="report-' + r.id + '">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">' +
            '<strong style="font-size: 15px;">' + escapeHtml(r.station) + '</strong>' +
            '<span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ' + badgeBg + '; color: ' + badgeColor + ';">' +
                escapeHtml(r.category) +
            '</span>' +
        '</div>' +
        '<div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">' +
            formatDate(r.incident_date) + ' at ' + escapeHtml(r.incident_time) +
            ' · ' + escapeHtml(r.direction) +
            (r.delay_minutes ? ' · <strong>' + r.delay_minutes + ' min delay</strong>' : '') +
            (r.reporter_name && r.reporter_name !== "Anonymous" ? ' · ' + escapeHtml(r.reporter_name) : '') +
        '</div>' +
        (r.description ? '<div style="font-size: 14px;">' + escapeHtml(r.description) + '</div>' : '') +
        discrepancy +
        upvoteHtml +
    '</div>';
}


/* ---- Load feed ---- */

function loadFeed(reset) {
    if (reset) feedOffset = 0;

    var container = document.getElementById("feed-container");
    var loadMoreContainer = document.getElementById("load-more-container");

    if (reset) {
        container.innerHTML =
            '<div style="text-align: center; padding: 40px; color: var(--text-muted);">' +
            '<div class="spinner" style="border-top-color: var(--district-green); border-color: var(--border);"></div>' +
            '<p style="margin-top: 12px; font-size: 14px;">Loading reports...</p></div>';
    }

    var parts = ["order=incident_date.desc,incident_time.desc"];
    parts.push("limit=" + FEED_PAGE_SIZE);
    parts.push("offset=" + feedOffset);

    var station = document.getElementById("filter-station").value;
    var category = document.getElementById("filter-category").value;
    if (station) parts.push("station=eq." + encodeURIComponent(station));
    if (category) parts.push("category=eq." + encodeURIComponent(category));

    supabaseSelect("reports", parts.join("&"))
        .then(function (reports) {
            if (reset && reports.length === 0) {
                container.innerHTML =
                    '<div style="text-align: center; padding: 40px; color: var(--text-muted);">' +
                    '<div style="font-size: 48px; margin-bottom: 8px;">📋</div>' +
                    '<p>No reports yet. <a href="index.html" style="color: var(--district-green); font-weight: 600;">Submit one</a> to get started.</p>' +
                    '</div>';
                loadMoreContainer.style.display = "none";
                return;
            }

            var html = reports.map(renderReport).join("");

            if (reset) {
                container.innerHTML = html;
            } else {
                container.innerHTML += html;
            }

            feedOffset += reports.length;

            if (reports.length < FEED_PAGE_SIZE) {
                loadMoreContainer.style.display = "none";
            } else {
                loadMoreContainer.style.display = "block";
            }

            // Attach upvote click handlers
            attachUpvoteHandlers();
        })
        .catch(function () {
            if (reset) {
                container.innerHTML =
                    '<div style="text-align: center; padding: 40px; color: var(--text-muted);">' +
                    '<p>Could not load reports. Check your Supabase config.</p></div>';
            }
        });
}

function attachUpvoteHandlers() {
    var buttons = document.querySelectorAll(".upvote-btn:not(.voted)");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].onclick = function () {
            var id = this.getAttribute("data-report-id");
            doUpvote(id, this);
        };
    }
}


/* ---- Filters ---- */
document.getElementById("filter-station").addEventListener("change", function () { loadFeed(true); });
document.getElementById("filter-category").addEventListener("change", function () { loadFeed(true); });

/* ---- Load more ---- */
document.getElementById("load-more-btn").addEventListener("click", function () { loadFeed(false); });

/* ---- Init ---- */
loadTimeLostHero();
loadFeed(true);
