#!/usr/bin/env node
/**
 * Automated PR Visual Evidence Capture Runner
 * Inspects git diff for UI modifications, executes targeted Playwright captures,
 * and formats the Ultra-Lean markdown evidence table for PR descriptions.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// CLI argument parsing
const args = process.argv.slice(2);
const getArg = (name) => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.substring(prefix.length) : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const customRoute = getArg('route');
const customDesc = getArg('desc');
const customViewport = getArg('viewport') || 'desktop';
const isDryRun = hasFlag('dry-run');

/**
 * 1. Inspect git diff for modified files
 */
function getModifiedFiles() {
  try {
    // Try diff against origin/main first, fallback to HEAD or uncommitted files
    let diff = '';
    try {
      diff = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch {
      diff = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
    }

    const stagedAndUnstaged = execSync('git status --porcelain', { encoding: 'utf8' });
    const dirtyFiles = stagedAndUnstaged
      .split('\n')
      .map((l) => l.trim().slice(3).trim())
      .filter(Boolean);

    const allFiles = Array.from(new Set([...diff.split('\n').map((f) => f.trim()).filter(Boolean), ...dirtyFiles]));
    return allFiles;
  } catch (err) {
    console.error('Error detecting git diff:', err.message);
    return [];
  }
}

/**
 * 2. Filter UI/Frontend files
 */
const UI_EXTENSIONS = /\.(tsx|jsx|vue|svelte|html|css|scss|sass)$/i;
const UI_DIRECTORIES = ['app/', 'components/', 'src/components/', 'src/pages/', 'src/views/', 'public/'];

function isUIFile(filePath) {
  if (UI_EXTENSIONS.test(filePath)) return true;
  return UI_DIRECTORIES.some((dir) => filePath.startsWith(dir));
}

/**
 * 3. Map changed files to target routes
 */
function inferTargetRoute(modifiedUIFiles) {
  if (customRoute) return customRoute;

  for (const file of modifiedUIFiles) {
    if (file.includes('cart')) return '/cart';
    if (file.includes('checkout')) return '/checkout';
    if (file.includes('shop')) return '/shop';
    if (file.includes('product')) return '/products';
    if (file.includes('category') || file.includes('categories')) return '/categories';
    if (file.includes('about')) return '/about';
    if (file.includes('contact')) return '/contact';
  }
  return '/';
}

/**
 * 4. Main Execution
 */
async function run() {
  const modifiedFiles = getModifiedFiles();
  const modifiedUIFiles = modifiedFiles.filter(isUIFile);

  // If no UI files were changed, output clean N/A table
  if (modifiedUIFiles.length === 0 && !customRoute) {
    const naOutput = `| Change Demonstrated | Preview |\n| :--- | :--- |\n| Backend / Logic change | *N/A (No frontend or visual UI files modified)* |`;
    console.log('\n--- PR Visual Evidence Markdown ---');
    console.log(naOutput);
    console.log('-----------------------------------\n');
    return;
  }

  const targetRoute = inferTargetRoute(modifiedUIFiles);
  const description = customDesc || `Visual proof of UI updates in: ${modifiedUIFiles.slice(0, 3).map((f) => path.basename(f)).join(', ')}${modifiedUIFiles.length > 3 ? '...' : ''} (Route: ${targetRoute})`;

  if (isDryRun) {
    console.log(`[DRY RUN] UI changes detected in ${modifiedUIFiles.length} file(s). Target route: ${targetRoute}`);
    return;
  }

  // Ensure output directory exists
  const evidenceDir = path.resolve(process.cwd(), '.github/pr-evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // Check if dev server is reachable
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  const targetUrl = new URL(targetRoute, baseUrl).toString();

  let isReachable = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(baseUrl, { signal: controller.signal });
    clearTimeout(timeout);
    isReachable = res.status < 500;
  } catch {
    isReachable = false;
  }

  if (!isReachable) {
    const offlineTable = `| Change Demonstrated | Preview |\n| :--- | :--- |\n| ${description} | *Targeted visual proof requires local dev server (${baseUrl}) to be running.* |`;
    console.log('\n--- PR Visual Evidence Markdown ---');
    console.log(offlineTable);
    console.log('-----------------------------------\n');
    return;
  }

  // Launch Playwright to capture targeted screenshot
  console.log(`Capturing visual evidence at ${targetUrl}...`);
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });

    const context = await browser.newContext(
      customViewport === 'mobile'
        ? { viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' }
        : { viewport: { width: 1280, height: 800 } }
    );

    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Allow any hydration or client transitions to settle
    await page.waitForTimeout(1000);

    const filename = `evidence-${Date.now()}.png`;
    const outputPath = path.join(evidenceDir, filename);
    await page.screenshot({ path: outputPath, fullPage: false });
    await browser.close();

    const relativePath = `.github/pr-evidence/${filename}`;
    const evidenceTable = `| Change Demonstrated | Preview |\n| :--- | :--- |\n| ${description} | ![${description}](${relativePath}) |`;

    console.log('\n--- PR Visual Evidence Markdown ---');
    console.log(evidenceTable);
    console.log('-----------------------------------\n');
  } catch (err) {
    console.warn(`Playwright capture note: ${err.message}`);
    const fallbackTable = `| Change Demonstrated | Preview |\n| :--- | :--- |\n| ${description} | *Visual capture attempted for ${targetRoute} (View details in Playwright logs)* |`;
    console.log('\n--- PR Visual Evidence Markdown ---');
    console.log(fallbackTable);
    console.log('-----------------------------------\n');
  }
}

run();
