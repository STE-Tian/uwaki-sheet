CREATE TABLE IF NOT EXISTS visitor_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  event_time TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  continent TEXT,
  region TEXT,
  region_code TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  timezone TEXT,
  asn INTEGER,
  organization TEXT,
  page_path TEXT NOT NULL,
  referrer_host TEXT,
  device_type TEXT,
  browser TEXT
);

CREATE INDEX IF NOT EXISTS idx_visitor_events_time
  ON visitor_events(event_time);
CREATE INDEX IF NOT EXISTS idx_visitor_events_country
  ON visitor_events(country_code);
CREATE INDEX IF NOT EXISTS idx_visitor_events_city
  ON visitor_events(city);
