import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PSL_FILE = resolve(ROOT, "psl/public_suffix_list.dat");
const OUTPUT = resolve(import.meta.dirname, "capabilities.json");

// Extract private-section domain lines from the PSL (source of truth for order and membership)
const psl = readFileSync(PSL_FILE, "utf8");
const lines = psl.split("\n");
const beginIdx = lines.indexOf("// ===BEGIN PRIVATE DOMAINS===");
const endIdx = lines.indexOf("// ===END PRIVATE DOMAINS===");
if (beginIdx === -1 || endIdx === -1) throw new Error("Missing PSL markers");

const pslDomains: string[] = [];
for (let i = beginIdx + 1; i < endIdx; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith("//")) continue;
  pslDomains.push(line);
}

// Load existing capabilities.json if present
let existing: Record<string, string[]> = {};
try {
  existing = JSON.parse(readFileSync(OUTPUT, "utf8"));
} catch {
  // First run
}

// Rebuild in PSL order: keep existing data, new entries get []
const capabilities: Record<string, string[]> = {};
for (const domain of pslDomains) {
  capabilities[domain] = existing[domain] ?? [];
}

const foreign = Object.keys(existing).filter((d) => !(d in capabilities));
for (const domain of foreign) {
  capabilities[domain] = existing[domain];
}
if (foreign.length > 0) {
  console.warn(`Warning: ${foreign.length} foreign entries persisted at end: ${foreign.join(", ")}`);
}

writeFileSync(OUTPUT, JSON.stringify(capabilities, null, 2) + "\n");

const total = pslDomains.length;
const kept = pslDomains.filter((d) => d in existing).length;
const added = total - kept;
const withCaps = Object.values(capabilities).filter((c) => c.length > 0).length;
console.log(
  `${total} domains (kept ${kept}, added ${added}), ${foreign.length} foreign, ${withCaps} with capabilities`,
);
