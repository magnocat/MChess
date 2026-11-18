import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN_PATTERNS = [
  { name: 'eval()', regex: /\beval\s*\(/ },
  { name: 'new Function()', regex: /\bnew\s+Function\s*\(/ },
  { name: 'innerHTML assignment', regex: /\.innerHTML\s*=/ },
  { name: 'Private Key Header', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
];

function walk(dir) {
  let results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results = results.concat(walk(full));
    } else if (/\.(js|mjs|html|css|json)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

const files = [...walk('src'), ...walk('public')];
let issues = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.regex.test(content)) {
      console.error(`[SECURITY FAIL] ${rule.name} encontrado em ${file}`);
      issues += 1;
    }
  }
}

if (issues > 0) {
  console.error(`Verificação de segurança falhou com ${issues} ocorrência(s).`);
  process.exit(1);
}

console.log(`Verificação de segurança aprovada em ${files.length} arquivos.`);
