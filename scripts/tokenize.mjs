import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = String.raw`C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\app\(tabs)`;

const FILES = [
  'animales.tsx', 'calendario.tsx', 'clima.tsx', 'economia.tsx', 'fabrica.tsx',
  'gestion.tsx', 'granja.tsx', 'logros.tsx', 'maquinaria.tsx', 'mercado.tsx',
  'oficina.tsx', 'procesado.tsx', 'subasta.tsx', 'tienda.tsx', 'tierras.tsx',
  'trabajadores.tsx', 'seguros.tsx',
];

// Color literal replacements (both quote styles)
const COLOR_MAP = [
  ["'#1a1a2e'", 'C.bg'],
  ['"#1a1a2e"', 'C.bg'],
  ["'#16213e'", 'C.bgCard'],
  ['"#16213e"', 'C.bgCard'],
  ["'#0f1f3d'", 'C.bgDeep'],
  ['"#0f1f3d"', 'C.bgDeep'],
  ["'#e8d5a3'", 'C.text'],
  ['"#e8d5a3"', 'C.text'],
  ["'#c9a84c'", 'C.textDim'],
  ['"#c9a84c"', 'C.textDim'],
  ["'#888888'", 'C.textMuted'],
  ['"#888888"', 'C.textMuted'],
  ["'#888'", 'C.textMuted'],
  ['"#888"', 'C.textMuted'],
  ["'#666666'", 'C.textFaint'],
  ['"#666666"', 'C.textFaint'],
  ["'#666'", 'C.textFaint'],
  ['"#666"', 'C.textFaint'],
  ["'#1e1e3a'", 'C.divider'],
  ['"#1e1e3a"', 'C.divider'],
  ["'#ffffff'", 'C.white'],
  ['"#ffffff"', 'C.white'],
  ["'#fff'", 'C.white'],
  ['"#fff"', 'C.white'],
  ["'rgba(255,255,255,0.1)'", "C.white + '1a'"],
  ['"rgba(255,255,255,0.1)"', "C.white + '1a'"],
];

const SPACING_MAP = { 4: 'S.xs', 8: 'S.sm', 12: 'S.md', 16: 'S.lg', 24: 'S.xl', 32: 'S.xxl' };
const FONT_MAP    = { 10: 'F.size.xs', 12: 'F.size.sm', 13: 'F.size.md', 14: 'F.size.lg', 16: 'F.size.xl', 18: 'F.size.xxl', 22: 'F.size.title' };
const RADIUS_MAP  = { 4: 'R.xs', 6: 'R.sm', 8: 'R.md', 12: 'R.lg', 16: 'R.xl', 999: 'R.pill' };

/**
 * Replace spacing/fontSize/borderRadius only within StyleSheet.create({...}) blocks.
 * Colors are replaced everywhere (already done).
 * maquinaria.tsx: colors also already replaced everywhere.
 */
function processStyleSheets(content) {
  // Find all StyleSheet.create({ ... }) blocks and replace only inside them
  // We'll track brace depth after each "StyleSheet.create(" to find the block

  let result = '';
  let i = 0;

  while (i < content.length) {
    // Look for "StyleSheet.create("
    const marker = 'StyleSheet.create(';
    const idx = content.indexOf(marker, i);

    if (idx === -1) {
      // No more StyleSheet.create — copy rest unchanged
      result += content.slice(i);
      break;
    }

    // Copy everything up to and including "StyleSheet.create("
    result += content.slice(i, idx + marker.length);
    i = idx + marker.length;

    // Now we're inside the StyleSheet.create( — find the matching closing )
    // The first char should be '{' — track brace depth
    if (content[i] !== '{') {
      // Unexpected — just continue
      continue;
    }

    // Find the extent of this block by counting braces
    let depth = 0;
    let blockStart = i;
    let j = i;
    while (j < content.length) {
      const ch = content[j];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          j++; // include closing }
          break;
        }
      }
      j++;
    }

    // Extract the block
    let block = content.slice(blockStart, j);

    // Apply spacing/fontSize/borderRadius replacements within the block
    block = block.replace(
      /\b(padding(?:Horizontal|Vertical|Top|Bottom|Left|Right|Start|End)?|margin(?:Horizontal|Vertical|Top|Bottom|Left|Right|Start|End)?)\s*:\s*(\d+)\b/g,
      (match, prop, val) => {
        const num = parseInt(val, 10);
        if (SPACING_MAP[num]) return `${prop}: ${SPACING_MAP[num]}`;
        return match;
      }
    );

    block = block.replace(
      /\bfontSize\s*:\s*(\d+)\b/g,
      (match, val) => {
        const num = parseInt(val, 10);
        if (FONT_MAP[num]) return `fontSize: ${FONT_MAP[num]}`;
        return match;
      }
    );

    block = block.replace(
      /\bborderRadius\s*:\s*(\d+)\b/g,
      (match, val) => {
        const num = parseInt(val, 10);
        if (RADIUS_MAP[num]) return `borderRadius: ${RADIUS_MAP[num]}`;
        return match;
      }
    );

    result += block;
    i = j;
  }

  return result;
}

function addMissingImports(content, fname) {
  // Check what tokens are used
  const usesC = /\bC\.[a-zA-Z]/.test(content);
  const usesS = /\bS\.(xs|sm|md|lg|xl|xxl)\b/.test(content);
  const usesF = /\bF\.(size|weight)\./.test(content);
  const usesR = /\bR\.(xs|sm|md|lg|xl|pill)\b/.test(content);

  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/constants\/theme['"]/;
  const match = content.match(importRegex);

  if (!match) {
    const needed = [];
    if (usesC) needed.push('C');
    if (usesS) needed.push('S');
    if (usesF) needed.push('F');
    if (usesR) needed.push('R');
    if (needed.length === 0) return content;
    const importLine = `import { ${needed.join(', ')} } from '../../constants/theme';`;
    // Insert after last existing import block
    return content.replace(/((?:^import [^\n]+\n)+)/m, (block) => block + importLine + '\n');
  }

  // Parse existing imports (may have SEASON_THEME, C, S, F etc.)
  const existing = match[1].split(',').map(s => s.trim()).filter(Boolean);
  const needed = [];
  if (usesC && !existing.includes('C')) needed.push('C');
  if (usesS && !existing.includes('S')) needed.push('S');
  if (usesF && !existing.includes('F')) needed.push('F');
  if (usesR && !existing.includes('R')) needed.push('R');

  if (needed.length === 0) return content;

  // Preserve original order + append needed
  const allTokens = [...existing, ...needed].join(', ');
  return content.replace(importRegex, `import { ${allTokens} } from '../../constants/theme'`);
}

let processed = 0;
let skipped = 0;

for (const fname of FILES) {
  const fpath = join(BASE, fname);
  if (!existsSync(fpath)) {
    console.log(`SKIP (not found): ${fname}`);
    skipped++;
    continue;
  }

  let content = readFileSync(fpath, 'utf8');
  const original = content;

  // 1. Replace color literals everywhere
  for (const [old, replacement] of COLOR_MAP) {
    content = content.split(old).join(replacement);
  }

  // 2. Replace StyleSheet numeric values (spacing, fontSize, borderRadius) ONLY inside StyleSheet blocks
  content = processStyleSheets(content);

  // 3. Ensure imports are correct
  content = addMissingImports(content, fname);

  if (content !== original) {
    writeFileSync(fpath, content, 'utf8');
    console.log(`UPDATED: ${fname}`);
  } else {
    console.log(`NO CHANGE: ${fname}`);
  }
  processed++;
}

console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}`);
