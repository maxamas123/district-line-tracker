/*
 * District Line Tracker - app.js
 * Minimal vanilla JS: connects the form to Supabase, fetches TfL status.
 * No frameworks, no libraries.
 *
 * SETUP: Replace the two values below with your Supabase project details.
 * Find them in Supabase Dashboard > Settings > API.
 */

var SUPABASE_URL = "https://mpcxvcrlvvybpxnmvkte.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_Mdg7Ho_4EGfYeX98I9_TOg_XIS5C9Ky";

/* ---- TfL API ---- */
var TFL_API = "https://api.tfl.gov.uk/Line/district/Status";

// Cache the TfL status so we don't call it twice
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

    // Colour the chip based on severity
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


/* ---- Toast ---- */

function showToast(message, type) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast " + (type || "success") + " show";
    setTimeout(function () { toast.classList.remove("show"); }, 3500);
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

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = document.getElementById("submit-btn");
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Submitting...';

        var delayVal = document.getElementById("delay_minutes").value;
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
            .then(function () {
                showToast("Report submitted — thank you!", "success");

                // Show discrepancy note if TfL says "Good Service" but user reports a delay
                showDiscrepancyNote(row);

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
            row.delay_minutes + "-minute delay. " +
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
