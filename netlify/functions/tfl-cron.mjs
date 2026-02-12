/*
 * tfl-cron.mjs - Netlify Scheduled Function
 * Runs every 15 minutes to log the TfL District line status to Supabase.
 *
 * This creates a regular snapshot so when someone reports a past delay,
 * we can look up what TfL *said* the service status was at that time
 * vs what passengers actually experienced.
 *
 * Environment variables (set in Netlify > Site > Environment variables):
 *   SUPABASE_URL         - e.g. https://abcdef.supabase.co
 *   SUPABASE_SERVICE_KEY  - your service_role key (preferred)
 *   SUPABASE_ANON_KEY     - your anon/public key (fallback)
 *
 * The function uses SUPABASE_SERVICE_KEY if available (bypasses RLS),
 * otherwise falls back to SUPABASE_ANON_KEY.
 */

export const config = {
    schedule: "*/15 * * * *"  // Every 15 minutes
};

export default async function handler() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing env vars. Need SUPABASE_URL and either SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY");
        return new Response("Config error", { status: 500 });
    }

    try {
        // 1. Fetch District line status from TfL
        const tflRes = await fetch("https://api.tfl.gov.uk/Line/district/Status");
        if (!tflRes.ok) {
            console.error("TfL API returned status:", tflRes.status);
            return new Response("TfL API error", { status: 502 });
        }
        const tflData = await tflRes.json();

        const statuses = tflData[0]?.lineStatuses;
        if (!statuses || statuses.length === 0) {
            console.error("Unexpected TfL response shape");
            return new Response("TfL parse error", { status: 500 });
        }

        // Pick the worst status (lowest severity = most disruptive)
        let lineStatus = statuses[0];
        for (let i = 1; i < statuses.length; i++) {
            if (statuses[i].statusSeverity < lineStatus.statusSeverity) {
                lineStatus = statuses[i];
            }
        }

        // 2. Write to Supabase tfl_status_log table
        const row = {
            status_severity: lineStatus.statusSeverity,
            status_description: lineStatus.statusSeverityDescription,
            reason: lineStatus.reason || null,
            raw_response: tflData[0]
        };

        const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/tfl_status_log`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(row)
        });

        if (!sbRes.ok) {
            const err = await sbRes.text();
            console.error("Supabase insert failed:", err);
            return new Response("DB error", { status: 500 });
        }

        console.log(`Logged TfL status: ${lineStatus.statusSeverityDescription} (severity ${lineStatus.statusSeverity})`);
        return new Response("OK", { status: 200 });

    } catch (err) {
        console.error("tfl-cron error:", err);
        return new Response("Error", { status: 500 });
    }
}
