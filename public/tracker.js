(() => {
  "use strict";

  const config = window.VISITOR_MAP_CONFIG || {};
  const apiBase = String(config.apiBase || "").replace(/\/$/, "");
  if (!apiBase || !/^https:\/\//i.test(apiBase)) return;

  const allowedHost = "ste-tian.github.io";
  if (location.hostname !== allowedHost) return;

  // Do not collect from local previews or non-production paths.
  if (!location.pathname.startsWith("/uwaki-sheet/")) return;

  const eventId = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : null;
  if (!eventId) return;

  const ua = navigator.userAgent || "";
  const deviceType = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Other";

  const payload = {
    event_id: eventId,
    page_path: location.pathname.slice(0, 300),
    referrer: document.referrer || "",
    device_type: deviceType,
    browser
  };

  // Fire-and-forget: analytics must never block the questionnaire.
  fetch(apiBase + "/api/collect", {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
})();
