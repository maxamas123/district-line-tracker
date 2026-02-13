/*
 * tfl-status.mjs - Netlify Function (on-demand)
 * Proxies the TfL District line status API so the browser doesn't
 * hit CORS issues calling api.tfl.gov.uk directly.
 *
 * Called from the client as: /.netlify/functions/tfl-status
 * Returns the TfL JSON response with proper CORS headers.
 */

export default async function handler(request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400"
            }
        });
    }

    try {
        const tflRes = await fetch("https://api.tfl.gov.uk/Line/district/Status");

        if (!tflRes.ok) {
            return new Response(JSON.stringify({ error: "TfL API error" }), {
                status: 502,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache"
                }
            });
        }

        const data = await tflRes.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=60"  // Cache for 60s
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Failed to reach TfL" }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
}
