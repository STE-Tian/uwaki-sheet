(() => {
  "use strict";
  const config = window.VISITOR_MAP_CONFIG || {};
  const apiBase = String(config.apiBase || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  let map;
  let markers;
  let chart;

  function status(message, error = false) {
    $("status").textContent = message;
    $("status").classList.toggle("error", error);
  }
  function number(value) {
    return Number(value || 0).toLocaleString("zh-CN");
  }
  async function api(path) {
    const response = await fetch(apiBase + path, {
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error("管理员身份验证失败。请确认 Cloudflare Access 已保护管理 API，并使用获准的邮箱登录。");
    }
    if (!response.ok) throw new Error("统计 API 请求失败：" + response.status);
    return response.json();
  }
  function initMap() {
    if (map || !window.L) return;
    map = L.map("map", { worldCopyJump: true }).setView([25, 10], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 10,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
  }
  function drawMap(rows) {
    initMap();
    if (!map) return;
    markers.clearLayers();
    rows.forEach(row => {
      if (!Number.isFinite(Number(row.latitude)) || !Number.isFinite(Number(row.longitude))) return;
      const radius = Math.max(5, Math.min(19, 4 + Math.sqrt(Number(row.visits || 1)) * 1.5));
      L.circleMarker([Number(row.latitude), Number(row.longitude)], {
        radius, color: "#ff33c4", weight: 1, fillColor: "#ff33c4", fillOpacity: .62
      }).bindPopup(
        "<strong>" + escapeHtml(row.city || "未知城市") + ", " + escapeHtml(row.country || "未知地区") +
        "</strong><br>访问次数：" + number(row.visits) +
        "<br>估算坐标：" + Number(row.latitude).toFixed(2) + ", " + Number(row.longitude).toFixed(2)
      ).addTo(markers);
    });
    setTimeout(() => map.invalidateSize(), 50);
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function drawCountries(rows) {
    const max = Math.max(1, ...rows.map(x => Number(x.visits || 0)));
    $("country-list").innerHTML = rows.length ? rows.slice(0, 12).map(row =>
      '<div class="country-row"><span class="country-name">' +
      escapeHtml(row.country || row.country_code || "未知地区") +
      '</span><span class="bar"><i style="width:' +
      (Number(row.visits || 0) / max * 100) + '%"></i></span><span class="country-count">' +
      number(row.visits) + '</span></div>'
    ).join("") : "<p>暂无数据</p>";
  }
  function drawTimeline(rows) {
    if (!window.Chart) return;
    if (chart) chart.destroy();
    chart = new Chart($("timeline"), {
      type: "line",
      data: {
        labels: rows.map(x => x.day),
        datasets: [{
          label: "访问量",
          data: rows.map(x => Number(x.visits)),
          borderColor: "#ff33c4",
          backgroundColor: "rgba(255,51,196,.12)",
          fill: true,
          tension: .28
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#c9cbd5" } } },
        scales: {
          x: { ticks: { color: "#999dab" }, grid: { color: "#2a2d38" } },
          y: { beginAtZero: true, ticks: { color: "#999dab" }, grid: { color: "#2a2d38" } }
        }
      }
    });
  }
  function drawRecent(rows) {
    $("recent").innerHTML = rows.length ? rows.map(row =>
      "<tr><td>" + escapeHtml(row.event_time || "") +
      "</td><td>" + escapeHtml(row.country || "—") +
      "</td><td>" + escapeHtml(row.city || "—") +
      "</td><td>" + escapeHtml(row.asn ? "AS" + row.asn : "—") +
      "</td><td>" + escapeHtml(row.page_path || "—") + "</td></tr>"
    ).join("") : '<tr><td colspan="5">暂无访问记录</td></tr>';
  }
  async function load() {
    if (!apiBase) {
      status("尚未配置采集服务。请先部署 worker，并在 public/visitor-config.js 中填写 Worker 地址。", true);
      return;
    }
    status("正在加载数据…");
    try {
      const days = Number($("range").value || 30);
      const suffix = "?days=" + encodeURIComponent(days);
      const [overview, mapData, countries, timeline, recent] = await Promise.all([
        api("/api/admin/overview" + suffix),
        api("/api/admin/map" + suffix),
        api("/api/admin/countries" + suffix),
        api("/api/admin/timeline" + suffix),
        api("/api/admin/recent" + suffix)
      ]);
      $("total").textContent = number(overview.total_visits);
      $("countries").textContent = number(overview.country_count);
      $("cities").textContent = number(overview.city_count);
      $("mapped").textContent = number(overview.mapped_visits);
      drawMap(mapData.rows || []);
      drawCountries(countries.rows || []);
      drawTimeline(timeline.rows || []);
      drawRecent(recent.rows || []);
      status("数据已更新 · 统计范围最近 " + days + " 天");
    } catch (error) {
      status(error.message || "加载失败", true);
    }
  }
  $("refresh").addEventListener("click", load);
  $("range").addEventListener("change", load);
  load();
})();
