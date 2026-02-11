/*
 * tfl-cron.mjs - Netlify Scheduled Function
 * Runs every 15 minutes to log the TfL District line status to Supabase.
 *
 * This creates a regular snapshot so when someone reports a past delay,
 * we can look up what TfL *said* the service status was at that time
 * vs what passengers actually experienced.
 *
 * Set these environment variables in Netlify (Site > Environment variables):
 *   SUPABASE_URL       - e.g. https://abcdef.supabase.co
 *   SUPABASE_SERVICE_KEY - your service_role key (NOT the anon key)
 */

export const config = {
    schedule: "*/15 * * * *"  // Every 15 minutes
};

export default async function handler() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
        return new Response("Config error", { status: 500 });
    }

    try {
        // 1. Fetch District line status from TfL
        const tflRes = await fetch("https://api.tfl.gov.uk/Line/district/Status");
        const tflData = await tflRes.json();

        const lineStatus = tflData[0]?.lineStatuses?.[0];
        if (!lineStatus) {
            console.error("Unexpected TfL response shape");
            return new Response("TfL parse error", { status: 500 });
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
