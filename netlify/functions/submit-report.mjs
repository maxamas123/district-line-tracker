/*
 * submit-report.mjs - Netlify Function
 * Proxies report creation through to Supabase with server-side rate limiting.
 * The client calls this instead of the Supabase RPC directly.
 *
 * Rate limit: max 1 report per 2 minutes per IP address.
 * Uses in-memory store (resets on cold start, which is acceptable for
 * a lightweight community app — it's a speed bump, not Fort Knox).
 */

const RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutes
const ipLastSubmit = new Map();

// Clean up old entries every 10 minutes to prevent memory leak
setInterval(function () {
    const cutoff = Date.now() - RATE_LIMIT_MS;
    for (const [ip, ts] of ipLastSubmit) {
        if (ts < cutoff) ipLastSubmit.delete(ip);
    }
}, 10 * 60 * 1000);

const SUPABASE_URL = "https://mpcxvcrlvvybpxnmvkte.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Mdg7Ho_4EGfYeX98I9_TOg_XIS5C9Ky";

export default async function handler(request) {
    // Only POST
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "https://fixthedistrict.org",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400"
            }
        });
    }

    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "https://fixthedistrict.org" }
        });
    }

    // Rate limit by IP
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || "unknown";

    const lastSubmit = ipLastSubmit.get(clientIp);
    if (lastSubmit && (Date.now() - lastSubmit) < RATE_LIMIT_MS) {
        const waitSecs = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastSubmit)) / 1000);
        return new Response(JSON.stringify({ error: "Please wait " + waitSecs + " seconds before submitting again" }), {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "https://fixthedistrict.org",
                "Retry-After": String(waitSecs)
            }
        });
    }

    try {
        const body = await request.json();

        // Forward to Supabase RPC
        const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_report`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const sbData = await sbRes.text();

        if (sbRes.ok) {
            // Record successful submission for rate limiting
            ipLastSubmit.set(clientIp, Date.now());
        }

        return new Response(sbData, {
            status: sbRes.status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "https://fixthedistrict.org"
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "https://fixthedistrict.org"
            }
        });
    }
}
