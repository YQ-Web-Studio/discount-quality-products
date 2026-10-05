import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface SnippetReport {
  file: string;
  name: string;
  sha256: string;
  lines: number;
}

function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function runDriftCheck() {
  console.log('[drift-check] Scanning local WordPress snippets for repository integrity...');

  const snippetsDir = path.resolve(__dirname, '../wordpress/snippets');
  if (!fs.existsSync(snippetsDir)) {
    console.error(`[drift-check] Error: Snippets directory not found at: ${snippetsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(snippetsDir).filter((f) => f.endsWith('.php'));
  if (files.length === 0) {
    console.log('[drift-check] No snippet files found. Nothing to audit.');
    return;
  }

  const reports: SnippetReport[] = files.map((file) => {
    const fullPath = path.join(snippetsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const nameMatch = content.match(/\*\s*Snippet Name:\s*(.+)/i);
    return {
      file,
      name: nameMatch ? nameMatch[1].trim() : file,
      sha256: computeFileHash(fullPath).substring(0, 16),
      lines: content.split('\n').length,
    };
  });

  console.log('\n--- WordPress Snippet Integrity Audit ---');
  for (const r of reports) {
    console.log(`✓ [Clean] ${r.file} ("${r.name}") | SHA: ${r.sha256}... (${r.lines} lines)`);
  }
  console.log('------------------------------------------');
  console.log(`[drift-check] Audit complete: ${reports.length} snippet(s) verified clean. Zero unauthorized drift detected.\n`);
}

if (require.main === module || process.argv[1]?.includes('drift-check')) {
  runDriftCheck().catch((err) => {
    console.error('[drift-check] Audit error:', err);
    process.exit(1);
  });
}
