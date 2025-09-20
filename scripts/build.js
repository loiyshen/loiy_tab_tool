/**
 * Robust build script for MV3 extension:
 * - Cleans and recreates dist/
 * - Copies src/background, src/sidepanel, src/shared, src/example -> dist/
 * - Copies icons/ -> dist/icons
 * - Copies public/manifest.json -> dist/manifest.json
 * - Prints a tree-like summary of dist content
 */
const fs = require('fs');
const path = require('path');

function log(...args) { console.log('[build]', ...args); }

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function cleanDir(p) {
  if (!fs.existsSync(p)) return;
  for (const entry of fs.readdirSync(p)) {
    const fp = path.join(p, entry);
    fs.rmSync(fp, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) { log('skip, not found:', src); return; }
  ensureDir(dest);
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
  log('copied dir:', src, '->', dest);
}

function copyFile(src, dest) {
  const dir = path.dirname(dest);
  ensureDir(dir);
  fs.copyFileSync(src, dest);
  log('copied file:', src, '->', dest);
}

function printTree(root, prefix = '') {
  if (!fs.existsSync(root)) { console.log(prefix + '(missing) ' + root); return; }
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(root, e.name);
    console.log(prefix + (e.isDirectory() ? '📁 ' : '📄 ') + e.name);
    if (e.isDirectory()) printTree(p, prefix + '   ');
  }
}

(function main() {
  try {
    const cwd = process.cwd();
    const dist = path.join(cwd, 'dist');
    const src = path.join(cwd, 'src');
    const pub = path.join(cwd, 'public');
    log('cwd:', cwd);

    ensureDir(dist);
    cleanDir(dist);
    log('dist cleaned:', dist);

    // copy source
    copyDir(path.join(src, 'background'), path.join(dist, 'background'));
    copyDir(path.join(src, 'sidepanel'), path.join(dist, 'sidepanel'));
    copyDir(path.join(src, 'shared'), path.join(dist, 'shared'));
    copyDir(path.join(src, 'example'), path.join(dist, 'example')); // presets/templates

    // copy icons
    copyDir(path.join(cwd, 'icons'), path.join(dist, 'icons'));

    // copy manifest
    const manifestSrc = path.join(pub, 'manifest.json');
    const manifestDest = path.join(dist, 'manifest.json');
    if (!fs.existsSync(manifestSrc)) {
      throw new Error('public/manifest.json not found: ' + manifestSrc);
    }
    copyFile(manifestSrc, manifestDest);

    console.log('Build complete. Load extension from dist/manifest.json');
    console.log('Dist tree:');
    printTree(dist, ' - ');
  } catch (e) {
    console.error('[build] ERROR:', e && e.stack || e);
    process.exit(1);
  }
})();