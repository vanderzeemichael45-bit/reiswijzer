import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const candidatePath = path.resolve('candidate/ReisWijzer.user.js');
export const candidateSource = fs.readFileSync(candidatePath, 'utf8');

export function extractFunction(name, source = candidateSource) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Function not found: ${name}`);
  const brace = source.indexOf('{', start + marker.length);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed function: ${name}`);
}

export function loadFunctions(names, globals = {}) {
  const context = vm.createContext({ console, ...globals });
  const declarations = names.map(name => extractFunction(name)).join('\n');
  const exportsExpression = names.map(name => `${JSON.stringify(name)}:${name}`).join(',');
  vm.runInContext(`${declarations}\nglobalThis.__candidateExports={${exportsExpression}};`, context);
  return context.__candidateExports;
}
