/*
 * Fix The District - app.js
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

/* Wimbledon branch stations for checking disruption relevance */
var WIMBLEDON_BRANCH_NAMES = [
    "wimbledon", "wimbledon park", "southfields", "east putney",
    "putney bridge", "parsons green", "fulham broadway", "west brompton",
    "earls court", "earl's court"
];

function getWimbledonBranchRelevance(reason) {
    if (!reason) return "unknown";
    var lower = reason.toLowerCase();

    for (var i = 0; i < WIMBLEDON_BRANCH_NAMES.length; i++) {
        if (lower.indexOf(WIMBLEDON_BRANCH_NAMES[i]) !== -1) return "affected";
    }

    /* Stations/areas clearly on other branches or the eastern trunk */
    var otherPatterns = [
        "upminster", "tower hill", "barking", "dagenham", "hornchurch",
        "east ham", "upton park", "plaistow", "west ham", "bow road",
        "mile end", "stepney green", "whitechapel", "aldgate east",
        "richmond", "kew", "turnham green", "gunnersbury",
        "ealing", "acton", "chiswick", "edgware road"
    ];

    for (var j = 0; j < otherPatterns.length; j++) {
        if (lower.indexOf(otherPatterns[j]) !== -1) return "other-branch";
    }

    return "unknown";
}

function escapeHtmlChars(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fetchTflStatus() {
    return fetch(TFL_API)
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data && data[0] && data[0].lineStatuses && data[0].lineStatuses.length > 0) {
                var statuses = data[0].lineStatuses;
                // Pick the worst status (lowest severity = most disruptive)
                var worst = statuses[0];
                for (var i = 1; i < statuses.length; i++) {
                    if (statuses[i].statusSeverity < worst.statusSeverity) {
                        worst = statuses[i];
                    }
                }
                currentTflStatus = {
                    severity: worst.statusSeverity,
                    description: worst.statusSeverityDescription,
                    reason: worst.reason || null
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
    if (!el || !status) return;

    el.style.display = "flex";
    el.className = "tfl-status";

    if (status.severity >= 10) {
        el.classList.add("good");
        el.innerHTML = '<span class="pulse"></span><span>TfL says: ' + escapeHtmlChars(status.description) + '</span>';
    } else {
        el.classList.add(status.severity >= 9 ? "minor" : "severe");

        var html = '<span class="pulse"></span>';
        html += '<span class="tfl-main">TfL says: <strong>' + escapeHtmlChars(status.description) + '</strong></span>';

        if (status.reason) {
            var reasonClean = status.reason.replace(/^District Line:\s*/i, "").trim();
            html += '<span class="tfl-reason">' + escapeHtmlChars(reasonClean) + '</span>';
        }

        var branch = getWimbledonBranchRelevance(status.reason);
        if (branch === "other-branch") {
            html += '<span class="tfl-branch-note">This disruption appears to be on another part of the District line</span>';
        } else if (branch === "affected") {
            html += '<span class="tfl-branch-note tfl-branch-warn">This disruption affects the Wimbledon branch</span>';
        }

        html += '<a href="https://tfl.gov.uk/tube-dlr-overground/status/" target="_blank" rel="noopener" class="tfl-link">View on TfL \u2197</a>';

        el.innerHTML = html;
    }
}


/* ---- Historical TfL status lookup ---- */

function lookupHistoricalTflStatus(dateStr, timeStr) {
    var isoDateTime = dateStr + "T" + timeStr + ":00";
    var params = "checked_at=lte." + encodeURIComponent(isoDateTime) + "&order=checked_at.desc&limit=1";

    return supabaseSelect("tfl_status_log", params).then(function (rows) {
        if (rows && rows.length > 0) {
            return {
                severity: rows[0].status_severity,
                description: rows[0].status_description,
                reason: rows[0].reason || null,
                checked_at: rows[0].checked_at
            };
        }
        return null;
    }).catch(function () {
        return null;
    });
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
    }).then(function (res) {
        if (!res.ok) {
            return res.json().then(function (err) {
                throw new Error(err.message || "RPC " + fnName + " failed");
            });
        }
        return res.json();
    });
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


/* ---- My reports tracking & ownership tokens ---- */

function generateOwnerToken() {
    if (window.crypto && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
}

function getOwnerToken(reportId) {
    var tokens = JSON.parse(localStorage.getItem("dlt_report_tokens") || "{}");
    return tokens[reportId] || null;
}

function isMyReport(reportId) {
    if (getOwnerToken(reportId)) return true;
    // Fallback: check old list (reports created before token system)
    var mine = JSON.parse(localStorage.getItem("dlt_my_reports") || "[]");
    return mine.indexOf(reportId) !== -1;
}

function recordMyReport(reportId, ownerToken) {
    var mine = JSON.parse(localStorage.getItem("dlt_my_reports") || "[]");
    if (mine.indexOf(reportId) === -1) {
        mine.push(reportId);
        localStorage.setItem("dlt_my_reports", JSON.stringify(mine));
    }
    if (ownerToken) {
        var tokens = JSON.parse(localStorage.getItem("dlt_report_tokens") || "{}");
        tokens[reportId] = ownerToken;
        localStorage.setItem("dlt_report_tokens", JSON.stringify(tokens));
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
    // Prevent double-clicks while RPC is in flight
    if (btnEl.disabled) return;
    btnEl.disabled = true;
    btnEl.style.opacity = "0.6";

    var alreadyVoted = hasUpvoted(reportId);

    // Demo mode: toggle UI only, no Supabase calls
    if (typeof isDemoMode === "function" && isDemoMode()) {
        var countEl = btnEl.querySelector(".upvote-count");
        var currentCount = countEl ? parseInt(countEl.textContent, 10) || 0 : 0;

        if (alreadyVoted) {
            var newCount = Math.max(0, currentCount - 1);
            markUnvoted(reportId);
            btnEl.innerHTML = '&#128077; Me too <span class="upvote-count">' + newCount + '</span>';
            btnEl.classList.remove("voted");
            btnEl.title = "Tap if you experienced this too";
            updateAffectedStats(reportId, newCount, btnEl);
            showToast("Your confirmation has been removed (demo)", "success");
        } else {
            var newCount = currentCount + 1;
            markUpvoted(reportId);
            btnEl.innerHTML = '&#10003; Confirmed <span class="upvote-count">' + newCount + '</span>';
            btnEl.classList.add("voted");
            btnEl.title = "Tap again to remove your confirmation";
            updateAffectedStats(reportId, newCount, btnEl);
            showToast("Confirmed (demo) — your time lost has been added", "success");
        }

        btnEl.disabled = false;
        btnEl.style.opacity = "";
        return;
    }

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
            })
            .finally(function () {
                btnEl.disabled = false;
                btnEl.style.opacity = "";
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
            })
            .finally(function () {
                btnEl.disabled = false;
                btnEl.style.opacity = "";
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
            '<p>We multiply the reported delay by the number of people affected (the original reporter + everyone who tapped "Me too") to calculate total passenger time lost.</p>' +
            '<p>For example: a 15-minute delay confirmed by 4 additional passengers = 15 &times; 5 = <strong>75 person-minutes (1 hr 15 min)</strong> of collective time wasted.</p>' +
            '<p>This gives TfL, MPs, and the media a real sense of the cumulative human cost of poor service.</p>' +
            '<p>Data collection began in February 2026. All figures reflect reports submitted since then.</p>' +
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

        var ownerToken = getOwnerToken(report.id);
        var editPromise;
        if (ownerToken) {
            editPromise = supabaseRpc("edit_report", {
                p_report_id: report.id,
                p_owner_token: ownerToken,
                p_incident_date: updated.incident_date,
                p_incident_time: updated.incident_time,
                p_station: updated.station,
                p_direction: updated.direction,
                p_category: updated.category,
                p_delay_minutes: updated.delay_minutes,
                p_description: updated.description,
                p_reporter_name: updated.reporter_name
            }).catch(function (rpcErr) {
                // Fallback if RPC not yet available (migration not run)
                if (rpcErr.message && rpcErr.message.indexOf("Could not find the function") !== -1) {
                    return supabaseUpdate("reports", report.id, updated);
                }
                throw rpcErr;
            });
        } else {
            // Legacy report without token — use direct update
            editPromise = supabaseUpdate("reports", report.id, updated);
        }

        editPromise
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
    var tokens = JSON.parse(localStorage.getItem("dlt_report_tokens") || "{}");
    delete tokens[reportId];
    localStorage.setItem("dlt_report_tokens", JSON.stringify(tokens));
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

        var ownerToken = getOwnerToken(reportId);
        var deletePromise;
        if (ownerToken) {
            deletePromise = supabaseRpc("delete_report", {
                p_report_id: reportId,
                p_owner_token: ownerToken
            }).catch(function (rpcErr) {
                // Fallback if RPC not yet available (migration not run)
                if (rpcErr.message && rpcErr.message.indexOf("Could not find the function") !== -1) {
                    return supabaseDelete("reports", reportId);
                }
                throw rpcErr;
            });
        } else {
            // Legacy report without token — use direct delete
            deletePromise = supabaseDelete("reports", reportId);
        }

        deletePromise
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

        // Determine TfL status: use live for recent incidents, historical for past ones
        var incidentDT = new Date(dateVal + "T" + timeVal);
        var diffMs = Math.abs(Date.now() - incidentDT.getTime());
        var ONE_HOUR_MS = 60 * 60 * 1000;

        var tflPromise;
        if (diffMs <= ONE_HOUR_MS) {
            // Within the last hour — use live status
            tflPromise = Promise.resolve({ status: currentTflStatus, historical: false });
        } else {
            // Past event — look up the closest snapshot from tfl_status_log
            tflPromise = lookupHistoricalTflStatus(dateVal, timeVal).then(function (s) {
                return { status: s || currentTflStatus, historical: !!s };
            });
        }

        tflPromise.then(function (tflResult) {
            var tflStatus = tflResult.status;
            var isHistorical = tflResult.historical;

            var ownerToken = generateOwnerToken();
            var rpcArgs = {
                p_incident_date: document.getElementById("incident_date").value,
                p_incident_time: document.getElementById("incident_time").value,
                p_station: document.getElementById("station").value,
                p_direction: document.getElementById("direction").value,
                p_category: document.getElementById("category").value,
                p_delay_minutes: delayVal ? parseInt(delayVal, 10) : null,
                p_description: document.getElementById("description").value,
                p_reporter_name: reporterName,
                p_tfl_status_severity: tflStatus ? tflStatus.severity : null,
                p_tfl_status_description: tflStatus ? tflStatus.description : null,
                p_tfl_status_reason: tflStatus ? tflStatus.reason : null,
                p_owner_token: ownerToken
            };

            // For discrepancy note display
            var rowForNote = {
                delay_minutes: rpcArgs.p_delay_minutes,
                tfl_status_severity: rpcArgs.p_tfl_status_severity,
                tfl_status_description: rpcArgs.p_tfl_status_description
            };

            return supabaseRpc("create_report", rpcArgs)
                .catch(function (rpcErr) {
                    // Fallback: if RPC function doesn't exist yet (migration not run),
                    // use direct insert
                    if (rpcErr.message && rpcErr.message.indexOf("Could not find the function") !== -1) {
                        var directRow = {
                            incident_date: rpcArgs.p_incident_date,
                            incident_time: rpcArgs.p_incident_time,
                            station: rpcArgs.p_station,
                            direction: rpcArgs.p_direction,
                            category: rpcArgs.p_category,
                            delay_minutes: rpcArgs.p_delay_minutes,
                            description: rpcArgs.p_description,
                            reporter_name: rpcArgs.p_reporter_name,
                            tfl_status_severity: rpcArgs.p_tfl_status_severity,
                            tfl_status_description: rpcArgs.p_tfl_status_description,
                            tfl_status_reason: rpcArgs.p_tfl_status_reason
                        };
                        return supabaseInsert("reports", directRow).then(function (data) {
                            return (data && data[0] && data[0].id) ? data[0].id : null;
                        });
                    }
                    throw rpcErr;
                })
                .then(function (result) {
                // RPC returns a UUID, fallback returns extracted id
                var reportId = typeof result === "string" ? result :
                    (Array.isArray(result) && result.length > 0 ? String(result[0]) : null);
                if (reportId) {
                    reportId = reportId.replace(/"/g, "");
                    recordMyReport(reportId, ownerToken);
                }

                recordSubmission();
                showToast("Report submitted — thank you!", "success");
                showDiscrepancyNote(rowForNote, isHistorical);
                checkRateLimitNotice();

                // Reset form (keep date, time, name)
                document.getElementById("station").value = "";
                document.getElementById("direction").value = "";
                document.getElementById("category").value = "";
                document.getElementById("delay_minutes").value = "";
                document.getElementById("description").value = "";
            });
        }).catch(function (err) {
            showToast("Error: " + err.message, "error");
        }).finally(function () {
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

function showDiscrepancyNote(row, isHistorical) {
    var noteEl = document.getElementById("discrepancy-note");
    if (!noteEl) return;

    var tflSeverity = row.tfl_status_severity;
    var tflDescription = row.tfl_status_description;
    if (tflSeverity == null) {
        noteEl.style.display = "none";
        return;
    }

    var tflSaysGood = tflSeverity >= 10;
    var userReportsDelay = row.delay_minutes && row.delay_minutes > 0;
    var verb = isHistorical ? "was reporting" : "currently reports";
    var verbAlt = isHistorical ? "TfL was reporting" : "TfL is currently reporting";

    if (tflSaysGood && userReportsDelay) {
        noteEl.className = "discrepancy-note mismatch";
        noteEl.innerHTML =
            "<strong>Discrepancy recorded.</strong> TfL " + verb + " " +
            '"Good Service" on the District line, but you experienced a ' +
            row.delay_minutes + '-minute delay. ' +
            "This mismatch has been logged and will be included in reports to your MP.";
        noteEl.style.display = "block";
    } else if (!tflSaysGood && userReportsDelay) {
        noteEl.className = "discrepancy-note match";
        noteEl.innerHTML =
            verbAlt + ": <strong>" + tflDescription +
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
