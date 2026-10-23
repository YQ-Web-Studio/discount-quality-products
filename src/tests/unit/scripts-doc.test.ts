import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('developer tooling & runbook verification', () => {
  it('defines standardized test environment npm scripts in package.json', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const scripts = pkg.scripts || {};

    expect(scripts['test:env:setup']).toBe('npm run test:env:start && npm run test:env:seed');
    expect(scripts['test:env:start']).toBe('wp-env start');
    expect(scripts['test:env:seed']).toBe('tsx backend/tools/seed-local-wp.ts');
    expect(scripts['test:env:stop']).toBe('wp-env stop');
    expect(scripts['test:webhook']).toBe('tsx backend/tools/simulate-stripe-webhook.ts');
  });

  it('provides testing.md documentation and links it from README.md', () => {
    const docPath = path.resolve(process.cwd(), 'docs/testing.md');
    expect(fs.existsSync(docPath)).toBe(true);

    const docContent = fs.readFileSync(docPath, 'utf8');
    expect(docContent).toContain('Prerequisites');
    expect(docContent).toContain('test:env:setup');
    expect(docContent).toContain('test:webhook');
    expect(docContent).toContain('Troubleshooting');

    const readmePath = path.resolve(process.cwd(), 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    expect(readmeContent).toContain('docs/testing.md');
  });
});
