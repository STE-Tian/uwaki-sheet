const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

function corsHeaders(origin, allowedOrigin) {
  if (!origin || origin !== allowedOrigin) return {};
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

async function constantTimeEqual(left, right) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  const aa = new Uint8Array(a);
  const bb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

async function isAdmin(request, env) {
  const expected = env.ADMIN_TOKEN || "";
  const supplied = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected || !supplied || supplied.length > 512) return false;
  return constantTimeEqual(supplied, expected);
}

function dateCutoff(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}
function clampDays(value) {
  const n = Number(value || 30);
  return Number.isFinite(n) ? Math.max(1, Math.min(90, Math.floor(n))) : 30;
}
function validEventId(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function roundCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
function hostOnly(value) {
  try { return value ? new URL(value).hostname.slice(0, 180) : null; }
  catch { return null; }
}

async function collect(request, env) {
  const origin = request.headers.get("Origin");
  if (origin !== env.ALLOWED_ORIGIN) return json({ error: "origin_not_allowed" }, 403);
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return json({ error: "content_type_not_allowed" }, 415);
  }

  const rawBody = await request.text();
  if (rawBody.length > 4096) return json({ error: "payload_too_large" }, 413);
  let body;
  try { body = JSON.parse(rawBody); }
  catch { return json({ error: "invalid_json" }, 400); }
  if (!validEventId(body.event_id)) return json({ error: "invalid_event_id" }, 400);

  const pagePath = typeof body.page_path === "string" &&
    body.page_path.startsWith("/") && body.page_path.length <= 300
    ? body.page_path.replace(/[\u0000-\u001f]/g, "") : null;
  if (!pagePath || pagePath.startsWith("//")) return json({ error: "invalid_page_path" }, 400);

  // Cloudflare supplies the connecting IP's approximate geo metadata in request.cf.
  // The IP itself is never read into application storage or written to D1.
  const cf = request.cf || {};
  const latitude = roundCoordinate(cf.latitude);
  const longitude = roundCoordinate(cf.longitude);
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO visitor_events (
        event_id, event_time, country, country_code, continent,
        region, region_code, city, latitude, longitude, timezone,
        asn, organization, page_path, referrer_host, device_type, browser
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.event_id,
      now,
      typeof cf.country === "string" ? cf.country.slice(0, 2) : null,
      typeof cf.country === "string" ? cf.country.slice(0, 2) : null,
      typeof cf.continent === "string" ? cf.continent.slice(0, 8) : null,
      typeof cf.region === "string" ? cf.region.slice(0, 120) : null,
      typeof cf.regionCode === "string" ? cf.regionCode.slice(0, 30) : null,
      typeof cf.city === "string" ? cf.city.slice(0, 120) : null,
      latitude,
      longitude,
      typeof cf.timezone === "string" ? cf.timezone.slice(0, 80) : null,
      Number.isInteger(cf.asn) ? cf.asn : null,
      typeof cf.asOrganization === "string" ? cf.asOrganization.slice(0, 180) : null,
      pagePath,
      hostOnly(body.referrer),
      ["mobile", "desktop"].includes(body.device_type) ? body.device_type : "unknown",
      ["Chrome", "Edge", "Firefox", "Safari", "Other"].includes(body.browser) ? body.browser : "Other"
    ).run();
    return json({ success: true });
  } catch {
    return json({ error: "storage_failed" }, 500);
  }
}

async function adminApi(request, env, url) {
  if (!await isAdmin(request, env)) return json({ error: "unauthorized" }, 401);

  const days = clampDays(url.searchParams.get("days"));
  const cutoff = dateCutoff(days);
  const path = url.pathname;

  try {
    if (path === "/api/admin/overview") {
      const row = await env.DB.prepare(`
        SELECT COUNT(*) AS total_visits,
          COUNT(DISTINCT country_code) AS country_count,
          COUNT(DISTINCT CASE WHEN city IS NOT NULL THEN country_code || ':' || city END) AS city_count,
          SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS mapped_visits
        FROM visitor_events WHERE event_time >= ?
      `).bind(cutoff).first();
      return json(row || {});
    }
    if (path === "/api/admin/map") {
      const result = await env.DB.prepare(`
        SELECT country, city, latitude, longitude, COUNT(*) AS visits
        FROM visitor_events
        WHERE event_time >= ? AND latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY country, city, latitude, longitude
        ORDER BY visits DESC LIMIT 1500
      `).bind(cutoff).all();
      return json({ rows: result.results || [] });
    }
    if (path === "/api/admin/countries") {
      const result = await env.DB.prepare(`
        SELECT country, country_code, COUNT(*) AS visits
        FROM visitor_events WHERE event_time >= ?
        GROUP BY country, country_code ORDER BY visits DESC LIMIT 50
      `).bind(cutoff).all();
      return json({ rows: result.results || [] });
    }
    if (path === "/api/admin/timeline") {
      const result = await env.DB.prepare(`
        SELECT substr(event_time, 1, 10) AS day, COUNT(*) AS visits
        FROM visitor_events WHERE event_time >= ?
        GROUP BY day ORDER BY day
      `).bind(cutoff).all();
      return json({ rows: result.results || [] });
    }
    if (path === "/api/admin/recent") {
      const result = await env.DB.prepare(`
        SELECT event_time, country, city, asn, page_path
        FROM visitor_events WHERE event_time >= ?
        ORDER BY event_time DESC LIMIT 50
      `).bind(cutoff).all();
      return json({ rows: result.results || [] });
    }
    return json({ error: "not_found" }, 404);
  } catch {
    return json({ error: "query_failed" }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      if (origin !== env.ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname === "/api/health") return json({ status: "ok" });
    if (url.pathname === "/api/collect") {
      const response = await collect(request, env);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    }
    if (url.pathname.startsWith("/api/admin/")) {
      const response = await adminApi(request, env, url);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    }
    return json({ error: "not_found" }, 404);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(env.DB.prepare(
      "DELETE FROM visitor_events WHERE event_time < ?"
    ).bind(dateCutoff(30)).run());
  }
};
