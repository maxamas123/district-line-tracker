/*
 * District Line Tracker - feed.js
 * Loads and renders the report feed from Supabase.
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

    return '<div class="card" style="border-left: 4px solid ' + borderColor + '; padding: 16px;">' +
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
            ' · ' + escapeHtml(r.reporter_name || "Anonymous") +
        '</div>' +
        (r.description ? '<div style="font-size: 14px;">' + escapeHtml(r.description) + '</div>' : '') +
        discrepancy +
    '</div>';
}

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

    // Build query params
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

            // Show/hide load more
            if (reports.length < FEED_PAGE_SIZE) {
                loadMoreContainer.style.display = "none";
            } else {
                loadMoreContainer.style.display = "block";
            }
        })
        .catch(function () {
            if (reset) {
                container.innerHTML =
                    '<div style="text-align: center; padding: 40px; color: var(--text-muted);">' +
                    '<p>Could not load reports. Check your Supabase config.</p></div>';
            }
        });
}

// Filters
document.getElementById("filter-station").addEventListener("change", function () { loadFeed(true); });
document.getElementById("filter-category").addEventListener("change", function () { loadFeed(true); });

// Load more
document.getElementById("load-more-btn").addEventListener("click", function () { loadFeed(false); });

// Init
loadFeed(true);
