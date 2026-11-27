import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin map uses a public dark basemap instead of the blocked OSM tile endpoint', async () => {
  const app = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../public/admin/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /https:\/\/(\{s\}\.)?tile\.openstreetmap\.org/);
  assert.match(app, /https:\/\/tiles\.openfreemap\.org\/styles\/dark/);
  assert.match(app, /https:\/\/openfreemap\.org\//);
  assert.match(app, /https:\/\/www\.openmaptiles\.org\//);
  assert.match(app, /https:\/\/www\.openstreetmap\.org\/copyright/);
  assert.match(app, /OpenMapTiles/);
  assert.match(app, /OpenStreetMap/);
  assert.match(html, /maplibre-gl@5\.6\.2/);
  assert.match(html, /@maplibre\/maplibre-gl-leaflet@0\.1\.4/);
  assert.match(html, /leaflet@1\.9\.4/);
});
