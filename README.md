# Google Maps Lead Extractor Pro

A production-grade full-stack SaaS for extracting live business data from Google Maps. 
**No mock data, no fake leads, strict data integrity.**

## Features
- **Real-time Live Extraction**: Uses Playwright to navigate Google Maps.
- **Strict Data Integrity**: Nulls are nulls, no guessed phone numbers, no fabricated data.
- **Job Isolation**: Each job has its own scoped database records.
- **Deduplication**: Deep deduplication across Place ID, URLs, and Name + Address combinations.
- **Challenge Detection**: Detects Google CAPTCHAs, unusual traffic warnings, and consent forms gracefully preserving what was already gathered.
- **Exports**: Secure CSV, JSON, and XLSX.
- **Resilient**: Graceful shutdowns, crash safety, and partial result preservation.

## Prerequisites
- Node.js 18+
- SQLite3 (handled via `better-sqlite3`)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Install Playwright browser:
   ```bash
   npx playwright install chromium
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

## Configuration (.env)
- `PORT`: HTTP Server port.
- `MAX_LEAD_LIMIT`: The max limit users can request.
- `MAX_CONCURRENT_JOBS`: Max simultaneous Playwright browsers.
- `PROXY_ENABLED`, `PROXY_SERVER`, `PROXY_USERNAME`, `PROXY_PASSWORD`: Proxy setup.
- `BROWSER_HEADLESS`: Run chromium in headless mode.

## Running the Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

## Testing
```bash
npm test
```

## Docker
Build the image:
```bash
docker build -t gmaps-extractor-pro .
```
Run the container:
```bash
docker run -p 3000:3000 -v $(pwd)/data:/usr/src/app/data gmaps-extractor-pro
```

## Limitations & Truthful Scraping Disclaimer
This application extracts only real data successfully obtained during the live Playwright session. It preserves partial real results when Google Maps blocks or interrupts extraction. 
Google may change its DOM structure, rate limits, or access policies at any time. There is no such thing as "100% undetectable" forever. If a challenge is detected, the extraction stops safely and saves the leads extracted up to that point. 
**Real Data > Target Count.**
