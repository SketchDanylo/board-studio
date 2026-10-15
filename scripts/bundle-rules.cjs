const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.join(__dirname, '..');
const target = path.join(root, 'board-studio.user.js');
const start = '  // ---------- bundled legal-move rules ----------';
const end = '  // ---------- end legal-move rules ----------';
const license = fs.readFileSync(path.join(root, 'node_modules/chess.js/LICENSE'), 'utf8');
const bundle = esbuild.buildSync({
  stdin: { contents: "export { Chess } from 'chess.js';", resolveDir: root },
  bundle: true, minify: true, format: 'iife', globalName: 'BoardStudioRules',
  target: 'es2020', write: false, legalComments: 'none'
}).outputFiles[0].text.trim();
const block = `${start}\n/* chess.js — BSD-2-Clause\n${license}\n*/\n${bundle}\n${end}\n\n`;
let source = fs.readFileSync(target, 'utf8');
if (source.includes(start)) {
  source = source.slice(0, source.indexOf(start)) + block + source.slice(source.indexOf(end) + end.length).replace(/^\r?\n\r?\n/, '');
} else {
  source = source.replace('  // ---------- settings ----------', block + '  // ---------- settings ----------');
}
fs.writeFileSync(target, source);
console.log('Bundled legal-move rules with license.');
