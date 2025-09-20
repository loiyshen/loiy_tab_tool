/**
 * Simple build script:
 * - Copies src/background, src/sidepanel, src/shared to dist/
 * - Copies public/manifest.json and icons/ to dist/
 * No bundling to keep it simple and reliable for MV3.
 */
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function ensureCleanDir(dir) {
  if (fs.existsSync(dir)) {
    // simple clean: remove contents
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      fs.rmSync(p, { recursive: true, force: true });
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

(function main() {
  const root = process.cwd();
  const dist = path.join(root, 'dist');
  const src = path.join(root, 'src');
  const pub = path.join(root, 'public');
  ensureCleanDir(dist);

  copyDir(path.join(src, 'background'), path.join(dist, 'background'));
  copyDir(path.join(src, 'sidepanel'), path.join(dist, 'sidepanel'));
  copyDir(path.join(src, 'shared'), path.join(dist, 'shared'));
  copyDir(path.join(root, 'icons'), path.join(dist, 'icons'));
  // manifest.json
  fs.copyFileSync(path.join(pub, 'manifest.json'), path.join(dist, 'manifest.json'));

  console.log('Build complete. Load extension from dist/manifest.json');
})();