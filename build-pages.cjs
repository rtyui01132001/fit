const fs = require('fs');
const path = require('path');
const out = path.resolve('dist');
fs.mkdirSync(out, {recursive:true});
// Explicit allowlist: never publish personal data.json or the local API server.
for (const name of ['index.html', 'style.css', 'script.js', 'github-store.js']) {
  fs.copyFileSync(path.join(__dirname, name), path.join(out, name));
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('GitHub Pages files prepared in ' + out);
