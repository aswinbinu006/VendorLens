import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// SHA-256 digests of known test secrets to prevent storing raw secrets in Git
const FORBIDDEN_SECRET_HASHES = new Set([
  '2b7aed60803308f8daf62cf4b72b603911d51fcd8adb71454163175b5afb8371', // openFDA key
  'dbdddc8f74fcb929d9cb5644f888f27d3ac222e19599fb1a6567012c6481870a'  // Mailtrap token
]);

const SECRET_PATTERNS = [
  { name: 'Generic API Key Assignment', regex: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/i },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ }
];

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.gemini', 'scratch', '.venv']);
const IGNORED_FILES = new Set(['.env']); // Local .env is developer-local

let findings = [];

function scanFile(filePath) {
  const relPath = path.relative(process.cwd(), filePath);
  const baseName = path.basename(filePath);
  if (IGNORED_FILES.has(baseName)) return;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Check for forbidden secret hashes by splitting tokens
      const words = line.match(/[a-zA-Z0-9_\-]{20,}/g) || [];
      for (const word of words) {
        const hash = crypto.createHash('sha256').update(word).digest('hex');
        if (FORBIDDEN_SECRET_HASHES.has(hash)) {
          findings.push({
            file: relPath,
            line: idx + 1,
            pattern: 'Forbidden Specific Secret',
            matchedSnippet: line.trim().replace(word, '<REDACTED>')
          });
        }
      }

      // Check regex patterns
      for (const pattern of SECRET_PATTERNS) {
        const match = pattern.regex.exec(line);
        if (match) {
          const matchedVal = match[1] || match[0];
          // Exclude placeholders and test dummies
          if (
            matchedVal.includes('REDACTED') ||
            matchedVal.includes('dummy_secret') ||
            matchedVal.includes('CHANGE_ME') ||
            matchedVal.includes('GENERATE_A_LONG_RANDOM_STRING') ||
            matchedVal.includes('YOUR_KEY') ||
            matchedVal.includes('SET_A_STRONG_PASSWORD')
          ) {
            continue;
          }
          findings.push({
            file: relPath,
            line: idx + 1,
            pattern: pattern.name,
            matchedSnippet: line.trim().replace(matchedVal, '<REDACTED>')
          });
        }
      }
    });
  } catch (err) {
    // Ignore unreadable/binary
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

console.log('Running secret scanner over working tree...');
walkDir(process.cwd());

if (findings.length > 0) {
  console.log(`Scan completed. Found ${findings.length} findings:`);
  findings.forEach(f => {
    console.log(`- [${f.pattern}] in ${f.file}:${f.line} -> ${f.matchedSnippet}`);
  });
  process.exit(1);
} else {
  console.log('Scan completed: 0 secrets detected across working tree.');
  process.exit(0);
}
