const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '../../packages/shared/dist');
const targetDir = path.resolve(__dirname, '../node_modules/@ingetec/shared/dist');

if (!fs.existsSync(sourceDir)) {
  throw new Error(`[sync-shared-build] Missing shared build output: ${sourceDir}`);
}

const sourceReal = fs.realpathSync.native(sourceDir);
const targetReal = fs.existsSync(targetDir) ? fs.realpathSync.native(targetDir) : null;

if (targetReal && sourceReal === targetReal) {
  console.log(`[sync-shared-build] Skipping copy; ${sourceDir} already resolves to ${targetDir}`);
  process.exit(0);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });
console.log(`[sync-shared-build] Copied ${sourceDir} -> ${targetDir}`);
