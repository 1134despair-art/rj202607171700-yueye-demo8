const fs = require('node:fs');
const path = require('node:path');

const project = path.resolve(__dirname, '..');
let target = project;
for (const directory of ['dist', 'build', 'h5']) {
  target = path.join(target, directory);
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
    throw new Error(`Refusing to clean a linked output directory: ${target}`);
  }
}
// unlink/rmdir handle this project's Unicode Windows path consistently.
function removeDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing to clean a linked output: ${file}`);
    if (entry.isDirectory()) removeDirectory(file);
    else fs.unlinkSync(file);
  }
  fs.rmdirSync(directory);
}
if (fs.existsSync(target)) removeDirectory(target);
if (fs.existsSync(target)) throw new Error('H5 output cleanup did not finish.');
console.log('Cleaned dist/build/h5');
