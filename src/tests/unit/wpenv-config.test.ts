import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('.wp-env.json configuration', () => {
  it('contains mandatory snippet mappings and debug settings', () => {
    const configPath = path.resolve(process.cwd(), '.wp-env.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config.mappings).toBeDefined();
    expect(config.mappings['wp-content/mu-plugins/snippets']).toBe('./backend/wordpress/snippets');
    expect(config.mappings['wp-content/mu-plugins/headless-redirect.php']).toBe('./wordpress/mu-plugins/headless-redirect.php');
    expect(config.config?.WP_DEBUG).toBe(true);
    expect(config.config?.SCRIPT_DEBUG).toBe(true);
  });
});
