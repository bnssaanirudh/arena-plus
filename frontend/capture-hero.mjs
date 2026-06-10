// One-off README hero capture: load dashboard, fire the demo cascade,
// let the pipeline stream in over WS, screenshot. Run from frontend/:
//   node capture-hero.mjs
import { chromium } from 'playwright';

const APP = 'http://localhost:5174';
const API = 'http://localhost:8001';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(`${APP}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(10_000); // WS connect + map tiles

console.log('firing demo cascade…');
await fetch(`${API}/api/v1/events/demo`, { method: 'POST' });
await page.waitForTimeout(75_000); // full cascade + acks

await page.screenshot({ path: '../docs/dashboard-hero.png' });
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(800);
await page.screenshot({ path: '../docs/dashboard-operations.png' });

console.log('saved docs/dashboard-hero.png + docs/dashboard-operations.png');
await browser.close();
