/*
 * District Line Tracker - app.js
 * Minimal vanilla JS: Supabase, TfL status, rate limiting, upvotes, edit.
 * No frameworks, no libraries.
 *
 * SETUP: Replace the two values below with your Supabase project details.
 * Find them in Supabase Dashboard > Settings > API.
 */

var SUPABASE_URL = "https://mpcxvcrlvvybpxnmvkte.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_Mdg7Ho_4EGfYeX98I9_TOg_XIS5C9Ky";

/* ---- TfL API ---- */
var TFL_API = "https://api.tfl.gov.uk/Line/district/Status";
var currentTflStatus = null;

function fetchTflStatus() {
    return fetch(TFL_API)
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data && data[0] && data[0].lineStatuses && data[0].lineStatuses[0]) {
                var status = data[0].lineStatuses[0];
                currentTflStatus = {
                    severity: status.statusSeverity,
                    description: status.statusSeverityDescription,
                    reason: status.reason || null
                };
            }
            return currentTflStatus;
        })
        .catch(function () {
            currentTflStatus = null;
            return null;
        });
}

function updateTflBanner(status) {
    var el = document.getElementById("tfl-live-status");
    var textEl = document.getElementById("tfl-status-text");
    if (!el || !textEl || !status) return;

    el.style.display = "inline-flex";
    textEl.textContent = "TfL says: " + status.description;

    el.className = "tfl-status";
    if (status.severity >= 10) {
        el.classList.add("good");
    } else if (status.severity >= 9) {
        el.classList.add("minor");
    } else {
        el.classList.add("severe");
    }
}


/* ---- Supabase helpers ---- */

function supabaseInsert(table, row) {
    return fetch(SUPABASE_URL + "/rest/v1/" + table, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(row)
    }).then(function (res) {
        if (!res.ok) {
            return res.json().then(function (err) {
                throw new Error(err.message || "Supabase error");
            });
        }
        return res.json();
    });
}

function supabaseSelect(table, params) {
    var query = SUPABASE_URL + "/rest/v1/" + table + "?select=*";
    if (params) query += "&" + params;

    return fetch(query, {
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY
        }
    }).then(function (res) { return res.json(); });
}

function supabaseRpc(fnName, args) {
    return fetch(SUPABASE_URL + "/rest/v1/rpc/" + fnName, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(args)
    }).then(function (res) { return res.json(); });
}

function supabaseUpdate(table, id, row) {
    return fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
        method: "PATCH",
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(row)
    }).then(function (res) {
        if (!res.ok) {
            return res.json().then(function (err) {
                throw new Error(err.message || "Supabase error");
            });
        }
        return res.json();
    });
}


function supabaseDelete(table, id) {
    return fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
        method: "DELETE",
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY
        }
    }).then(function (res) {
        if (!res.ok) {
            return res.text().then(function (text) {
                throw new Error(text || "Delete failed");
            });
        }
        return true;
    });
}


/* ---- Toast ---- */

function showToast(message, type) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast " + (type || "success") + " show";
    setTimeout(function () { toast.classList.remove("show"); }, 3500);
}


/* ---- Rate limiting ---- */

var RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutes between submissions

function canSubmit() {
    var last = localStorage.getItem("dlt_last_submit");
    if (!last) return true;
    return (Date.now() - parseInt(last, 10)) > RATE_LIMIT_MS;
}

function recordSubmission() {
    localStorage.setItem("dlt_last_submit", String(Date.now()));
}

function getSecondsUntilCanSubmit() {
    var last = localStorage.getItem("dlt_last_submit");
    if (!last) return 0;
    var remaining = RATE_LIMIT_MS - (Date.now() - parseInt(last, 10));
    return Math.max(0, Math.ceil(remaining / 1000));
}


/* ---- My reports tracking ---- */

function isMyReport(reportId) {
    var mine = JSON.parse(localStorage.getItem("dlt_my_reports") || "[]");
    return mine.indexOf(reportId) !== -1;
}

function recordMyReport(reportId) {
    var mine = JSON.parse(localStorage.getItem("dlt_my_reports") || "[]");
    if (mine.indexOf(reportId) === -1) {
        mine.push(reportId);
        localStorage.setItem("dlt_my_reports", JSON.stringify(mine));
    }
}


/* ---- Shared utility ---- */

function formatHoursShared(totalMinutes) {
    if (totalMinutes < 60) return totalMinutes + " min";
    var hrs = Math.floor(totalMinutes / 60);
    var mins = Math.round(totalMinutes % 60);
    if (mins === 0) return hrs + " hr" + (hrs > 1 ? "s" : "");
    return hrs + " hr" + (hrs > 1 ? "s" : "") + " " + mins + " min";
}

function updateAffectedStats(reportId, newUpvoteCount, btnEl) {
    var span = document.querySelector('.affected-stats[data-report-id="' + reportId + '"]');
    if (!span) return;
    var delayMins = parseInt(btnEl.getAttribute("data-delay"), 10) || 0;
    var peopleLost = 1 + newUpvoteCount;
    var word = peopleLost === 1 ? "person" : "people";
    if (delayMins > 0) {
        var fmtFn = typeof formatHours === "function" ? formatHours : formatHoursShared;
        span.textContent = peopleLost + " " + word + " affected · " + fmtFn(delayMins * peopleLost) + " lost";
    } else {
        span.textContent = peopleLost + " " + word + " affected";
    }
}


/* ---- Upvote helpers (toggleable) ---- */

function hasUpvoted(reportId) {
    var voted = JSON.parse(localStorage.getItem("dlt_upvoted") || "[]");
    return voted.indexOf(reportId) !== -1;
}

function markUpvoted(reportId) {
    var voted = JSON.parse(localStorage.getItem("dlt_upvoted") || "[]");
    if (voted.indexOf(reportId) === -1) {
        voted.push(reportId);
        localStorage.setItem("dlt_upvoted", JSON.stringify(voted));
    }
}

function markUnvoted(reportId) {
    var voted = JSON.parse(localStorage.getItem("dlt_upvoted") || "[]");
    var idx = voted.indexOf(reportId);
    if (idx !== -1) {
        voted.splice(idx, 1);
        localStorage.setItem("dlt_upvoted", JSON.stringify(voted));
    }
}

function extractRpcCount(result) {
    if (typeof result === "number") return result;
    if (typeof result === "string") return parseInt(result, 10) || 0;
    if (result && typeof result === "object") {
        if (Array.isArray(result) && result.length > 0) return extractRpcCount(result[0]);
        var keys = Object.keys(result);
        for (var i = 0; i < keys.length; i++) {
            var val = result[keys[i]];
            if (typeof val === "number") return val;
        }
    }
    return 0;
}

function doUpvote(reportId, btnEl) {
    var alreadyVoted = hasUpvoted(reportId);

    if (alreadyVoted) {
        // Toggle OFF: remove upvote
        supabaseRpc("downvote_report", { report_id: reportId })
            .then(function (resp) {
                var newCount = extractRpcCount(resp);
                markUnvoted(reportId);
                btnEl.innerHTML = '&#128077; Me too <span class="upvote-count">' + newCount + '</span>';
                btnEl.classList.remove("voted");
                btnEl.title = "Tap if you experienced this too";
                updateAffectedStats(reportId, newCount, btnEl);
                showToast("Your confirmation has been removed", "success");
                if (typeof loadTimeLostHero === "function") loadTimeLostHero();
            })
            .catch(function () {
                showToast("Could not remove vote. Try again.", "error");
            });
    } else {
        // Toggle ON: add upvote
        supabaseRpc("upvote_report", { report_id: reportId })
            .then(function (resp) {
                var newCount = extractRpcCount(resp);
                markUpvoted(reportId);
                btnEl.innerHTML = '&#10003; Confirmed <span class="upvote-count">' + newCount + '</span>';
                btnEl.classList.add("voted");
                btnEl.title = "Tap again to remove your confirmation";
                updateAffectedStats(reportId, newCount, btnEl);
                showToast("Confirmed — your time lost has been added", "success");
                if (typeof loadTimeLostHero === "function") loadTimeLostHero();
            })
            .catch(function () {
                showToast("Could not upvote. Try again.", "error");
            });
    }
}


/* ---- Info modal ---- */

function showInfoModal() {
    var overlay = document.createElement("div");
    overlay.className = "info-modal-overlay";
    overlay.innerHTML =
        '<div class="info-modal">' +
            '<h3>How is "time lost" calculated?</h3>' +
            '<p>Each report includes an estimated delay in minutes. When you tap <strong>"Me too"</strong> on someone else\'s report, you\'re confirming you experienced the same delay.</p>' +
            '<p>We multiply the reported delay by the number of people affected (the original reporter + everyone who tapped "Me too") to calculate total commuter time lost.</p>' +
            '<p>For example: a 15-minute delay confirmed by 4 additional commuters = 15 &times; 5 = <strong>75 person-minutes (1 hr 15 min)</strong> of collective time wasted.</p>' +
            '<p>This gives TfL, MPs, and the media a real sense of the cumulative human cost of poor service.</p>' +
            '<button class="close-modal" onclick="this.closest(\'.info-modal-overlay\').remove()">Got it</button>' +
        '</div>';
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
}


/* ---- Edit modal ---- */

var STATIONS_LIST = [
    "Wimbledon", "Wimbledon Park", "Southfields", "East Putney",
    "Putney Bridge", "Parsons Green", "Fulham Broadway", "West Brompton", "Earls Court"
];

var CATEGORIES_LIST = [
    "General Delays", "Signal Failure", "Overcrowding", "Train Cancellation",
    "Reduced Service", "No Announcements / Poor Comms", "Safety Concern", "Other"
];

var DIRECTIONS_LIST = [
    "Eastbound (towards Earls Court)", "Westbound (towards Wimbledon)", "Both / General"
];

function showEditModal(report) {
    var overlay = document.createElement("div");
    overlay.className = "edit-modal-overlay";

    var stationOptions = STATIONS_LIST.map(function (s) {
        return '<option value="' + s + '"' + (s === report.station ? ' selected' : '') + '>' + s + '</option>';
    }).join("");

    var directionOptions = DIRECTIONS_LIST.map(function (d) {
        return '<option value="' + d + '"' + (d === report.direction ? ' selected' : '') + '>' + d + '</option>';
    }).join("");

    var categoryOptions = CATEGORIES_LIST.map(function (c) {
        return '<option value="' + c + '"' + (c === report.category ? ' selected' : '') + '>' + c + '</option>';
    }).join("");

    overlay.innerHTML =
        '<div class="edit-modal">' +
            '<h3>Edit your report</h3>' +
            '<div class="form-group">' +
                '<label>Date</label>' +
                '<input type="date" id="edit-date" value="' + (report.incident_date || '') + '" min="2026-01-01">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Time</label>' +
                '<input type="time" id="edit-time" value="' + (report.incident_time || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Station</label>' +
                '<select id="edit-station">' + stationOptions + '</select>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Direction</label>' +
                '<select id="edit-direction">' + directionOptions + '</select>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Category</label>' +
                '<select id="edit-category">' + categoryOptions + '</select>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Delay (minutes)</label>' +
                '<input type="number" id="edit-delay" min="0" max="60" value="' + (report.delay_minutes || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Description</label>' +
                '<textarea id="edit-description" rows="3">' + (report.description || '') + '</textarea>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Your name</label>' +
                '<input type="text" id="edit-name" placeholder="Anonymous">' +
            '</div>' +
            '<div class="btn-row">' +
                '<button class="btn-cancel" id="edit-cancel-btn">Cancel</button>' +
                '<button class="btn-save" id="edit-save-btn">Save changes</button>' +
            '</div>' +
        '</div>';

    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    // Set name value safely via JS (avoids quote escaping issues in innerHTML)
    document.getElementById("edit-name").value = report.reporter_name || "";

    document.getElementById("edit-cancel-btn").addEventListener("click", function () {
        overlay.remove();
    });

    document.getElementById("edit-save-btn").addEventListener("click", function () {
        // Time validation: only during operating hours (04:30–01:30)
        var editTimeVal = document.getElementById("edit-time").value;
        if (editTimeVal) {
            var etp = editTimeVal.split(":");
            var eTotalMins = parseInt(etp[0], 10) * 60 + parseInt(etp[1], 10);
            if (eTotalMins > 90 && eTotalMins < 270) {
                showToast("Trains don\u2019t run between 1:30am and 4:30am. Please check the time.", "error");
                return;
            }
        }

        var delayVal = document.getElementById("edit-delay").value;

        // Delay validation: max 60 minutes
        if (delayVal && parseInt(delayVal, 10) > 60) {
            showToast("Maximum delay is 60 minutes per report.", "error");
            return;
        }

        // Delay confirmation: warn if over 30 minutes
        if (delayVal && parseInt(delayVal, 10) > 30) {
            if (!confirm("You\u2019ve entered a delay of " + delayVal + " minutes. Delays over 30 minutes are unusual \u2014 are you sure?")) {
                return;
            }
        }

        var btn = this;
        btn.disabled = true;
        btn.textContent = "Saving...";

        var nameVal = document.getElementById("edit-name").value;
        var updated = {
            incident_date: document.getElementById("edit-date").value,
            incident_time: document.getElementById("edit-time").value,
            station: document.getElementById("edit-station").value,
            direction: document.getElementById("edit-direction").value,
            category: document.getElementById("edit-category").value,
            delay_minutes: delayVal ? parseInt(delayVal, 10) : null,
            description: document.getElementById("edit-description").value,
            reporter_name: nameVal || "Anonymous"
        };

        supabaseUpdate("reports", report.id, updated)
            .then(function () {
                overlay.remove();
                showToast("Report updated", "success");
                // Reload feed if on feed page
                if (typeof loadFeed === "function") loadFeed(true);
                if (typeof loadTimeLostHero === "function") loadTimeLostHero();
            })
            .catch(function (err) {
                btn.disabled = false;
                btn.textContent = "Save changes";
                showToast("Error: " + err.message, "error");
            });
    });
}


/* ---- Delete confirmation ---- */

function removeMyReport(reportId) {
    var mine = JSON.parse(localStorage.getItem("dlt_my_reports") || "[]");
    var idx = mine.indexOf(reportId);
    if (idx !== -1) {
        mine.splice(idx, 1);
        localStorage.setItem("dlt_my_reports", JSON.stringify(mine));
    }
}

function showDeleteConfirm(reportId) {
    var overlay = document.createElement("div");
    overlay.className = "edit-modal-overlay";
    overlay.innerHTML =
        '<div class="edit-modal" style="max-width: 360px;">' +
            '<h3>Delete this report?</h3>' +
            '<p style="font-size: 14px; color: var(--text-muted); margin-bottom: 16px;">This will permanently remove your report. This action cannot be undone.</p>' +
            '<div class="btn-row">' +
                '<button class="btn-cancel" id="delete-cancel-btn">Cancel</button>' +
                '<button class="btn-save" id="delete-confirm-btn" style="background: var(--red);">Delete</button>' +
            '</div>' +
        '</div>';

    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    document.getElementById("delete-cancel-btn").addEventListener("click", function () {
        overlay.remove();
    });

    document.getElementById("delete-confirm-btn").addEventListener("click", function () {
        var btn = this;
        btn.disabled = true;
        btn.textContent = "Deleting...";

        supabaseDelete("reports", reportId)
            .then(function () {
                overlay.remove();
                removeMyReport(reportId);
                showToast("Report deleted", "success");
                // Remove the card from the feed
                var card = document.getElementById("report-" + reportId);
                if (card) card.remove();
                if (typeof loadTimeLostHero === "function") loadTimeLostHero();
            })
            .catch(function (err) {
                btn.disabled = false;
                btn.textContent = "Delete";
                showToast("Could not delete report. Try again.", "error");
            });
    });
}


/* ---- Form submission ---- */

function initReportForm() {
    var form = document.getElementById("report-form");
    if (!form) return;

    // Set defaults
    var now = new Date();
    var dateInput = document.getElementById("incident_date");
    var timeInput = document.getElementById("incident_time");

    dateInput.value = now.toISOString().split("T")[0];
    timeInput.value =
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0");

    // Restore saved name
    var savedName = localStorage.getItem("dlt_reporter_name");
    if (savedName) {
        document.getElementById("reporter_name").value = savedName;
    }

    // Show rate-limit notice if recently submitted
    checkRateLimitNotice();

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        // Date validation: no earlier than 1 Jan 2026
        var dateVal = document.getElementById("incident_date").value;
        if (dateVal < "2026-01-01") {
            showToast("Date must be 1 January 2026 or later", "error");
            return;
        }

        // Time validation: only during operating hours (04:30–01:30)
        var timeVal = document.getElementById("incident_time").value;
        if (timeVal) {
            var tp = timeVal.split(":");
            var totalMins = parseInt(tp[0], 10) * 60 + parseInt(tp[1], 10);
            // Invalid window: 01:31 (91 mins) to 04:29 (269 mins)
            if (totalMins > 90 && totalMins < 270) {
                showToast("Trains don\u2019t run between 1:30am and 4:30am. Please check the time.", "error");
                return;
            }
        }

        // Rate limit check
        if (!canSubmit()) {
            var secs = getSecondsUntilCanSubmit();
            showToast("Please wait " + secs + "s before submitting again", "error");
            return;
        }

        var delayVal = document.getElementById("delay_minutes").value;

        // Delay validation: max 60 minutes
        if (delayVal && parseInt(delayVal, 10) > 60) {
            showToast("Maximum delay is 60 minutes per report. For longer disruptions, submit multiple reports.", "error");
            return;
        }

        // Delay confirmation: warn if over 30 minutes
        if (delayVal && parseInt(delayVal, 10) > 30) {
            if (!confirm("You\u2019ve entered a delay of " + delayVal + " minutes. Delays over 30 minutes are unusual \u2014 are you sure this is correct?")) {
                return;
            }
        }

        var btn = document.getElementById("submit-btn");
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Submitting...';
        var reporterName = document.getElementById("reporter_name").value || "Anonymous";

        // Save name for next time
        if (reporterName !== "Anonymous") {
            localStorage.setItem("dlt_reporter_name", reporterName);
        }

        var row = {
            incident_date: document.getElementById("incident_date").value,
            incident_time: document.getElementById("incident_time").value,
            station: document.getElementById("station").value,
            direction: document.getElementById("direction").value,
            category: document.getElementById("category").value,
            delay_minutes: delayVal ? parseInt(delayVal, 10) : null,
            description: document.getElementById("description").value,
            reporter_name: reporterName,
            tfl_status_severity: currentTflStatus ? currentTflStatus.severity : null,
            tfl_status_description: currentTflStatus ? currentTflStatus.description : null,
            tfl_status_reason: currentTflStatus ? currentTflStatus.reason : null
        };

        supabaseInsert("reports", row)
            .then(function (data) {
                // Track this as our own report
                if (data && data[0] && data[0].id) {
                    recordMyReport(data[0].id);
                }

                recordSubmission();
                showToast("Report submitted — thank you!", "success");
                showDiscrepancyNote(row);
                checkRateLimitNotice();

                // Reset form (keep date, time, name)
                document.getElementById("station").value = "";
                document.getElementById("direction").value = "";
                document.getElementById("category").value = "";
                document.getElementById("delay_minutes").value = "";
                document.getElementById("description").value = "";
            })
            .catch(function (err) {
                showToast("Error: " + err.message, "error");
            })
            .finally(function () {
                btn.disabled = false;
                btn.textContent = "Submit Report";
            });
    });
}

function checkRateLimitNotice() {
    var notice = document.getElementById("rate-limit-notice");
    if (!notice) return;
    if (!canSubmit()) {
        var secs = getSecondsUntilCanSubmit();
        notice.textContent = "You submitted a report recently. You can submit again in " + Math.ceil(secs / 60) + " minute(s).";
        notice.style.display = "block";
        // Auto-hide when cooldown expires
        setTimeout(function () {
            notice.style.display = "none";
        }, secs * 1000);
    } else {
        notice.style.display = "none";
    }
}

function showDiscrepancyNote(row) {
    var noteEl = document.getElementById("discrepancy-note");
    if (!noteEl || !currentTflStatus) return;

    var tflSaysGood = currentTflStatus.severity >= 10;
    var userReportsDelay = row.delay_minutes && row.delay_minutes > 0;

    if (tflSaysGood && userReportsDelay) {
        noteEl.className = "discrepancy-note mismatch";
        noteEl.innerHTML =
            "<strong>Discrepancy recorded.</strong> TfL currently reports " +
            '"Good Service" on the District line, but you experienced a ' +
            row.delay_minutes + '-minute delay. ' +
            "This mismatch has been logged and will be included in reports to your MP.";
        noteEl.style.display = "block";
    } else if (!tflSaysGood && userReportsDelay) {
        noteEl.className = "discrepancy-note match";
        noteEl.innerHTML =
            "TfL is currently reporting: <strong>" + currentTflStatus.description +
            "</strong>. Your report helps document the real-world impact.";
        noteEl.style.display = "block";
    } else {
        noteEl.style.display = "none";
    }
}


/* ---- Init on page load ---- */

fetchTflStatus().then(function (status) {
    updateTflBanner(status);
});

initReportForm();
