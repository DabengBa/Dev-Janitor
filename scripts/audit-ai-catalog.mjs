import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const catalogPath = path.join(root, 'scripts', 'ai-cli-catalog.json');
const metadataPath = path.join(root, 'src-tauri', 'src', 'ai_tools', 'mod.rs');
const network = process.argv.includes('--network');

const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const metadataSource = await fs.readFile(metadataPath, 'utf8');
const metadataEntries = [...metadataSource.matchAll(
  /AiToolMetadata\s*\{[\s\S]*?\bid:\s*"([^"]+)"[\s\S]*?\bdocs_url:\s*"([^"]+)"/g,
)].map(([, id, docsUrl]) => ({ id, docsUrl }));

const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);

if (!Array.isArray(catalog.tools) || catalog.tools.length === 0) {
  fail('catalog.tools must contain at least one tool');
}

const catalogIds = new Set();
for (const tool of catalog.tools ?? []) {
  if (!tool.id || catalogIds.has(tool.id)) {
    fail(`duplicate or empty catalog id: ${tool.id ?? '<empty>'}`);
  }
  catalogIds.add(tool.id);
  if (typeof tool.docsUrl !== 'string' || !tool.docsUrl.startsWith('https://')) {
    fail(`${tool.id}: docsUrl must use HTTPS`);
  }
  if (tool.registry && !['npm', 'pypi'].includes(tool.registry.type)) {
    fail(`${tool.id}: unsupported registry type ${tool.registry.type}`);
  }
}

const metadataIds = new Set(metadataEntries.map((entry) => entry.id));
for (const entry of metadataEntries) {
  const catalogTool = catalog.tools.find((tool) => tool.id === entry.id);
  if (!catalogTool) {
    fail(`${entry.id}: missing from scripts/ai-cli-catalog.json`);
    continue;
  }
  if (catalogTool.docsUrl !== entry.docsUrl) {
    fail(`${entry.id}: catalog docsUrl does not match ai_tools metadata`);
  }
}
for (const id of catalogIds) {
  if (!metadataIds.has(id)) {
    fail(`${id}: catalog entry is not present in ai_tools metadata`);
  }
}

const reviewed = Date.parse(`${catalog.reviewedAt}T00:00:00Z`);
if (!Number.isFinite(reviewed)) {
  fail('reviewedAt must be an ISO date');
} else {
  const ageDays = (Date.now() - reviewed) / 86_400_000;
  if (ageDays > Number(catalog.maxReviewAgeDays ?? 120)) {
    fail(`AI CLI catalog is ${Math.floor(ageDays)} days old; review official sources again`);
  }
}

if (network) {
  const fetchWithTimeout = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      return await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'Dev-Janitor AI CLI catalog audit' },
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const checks = [];
  for (const tool of catalog.tools ?? []) {
    checks.push((async () => {
      try {
        const response = await fetchWithTimeout(tool.docsUrl);
        if (response.status === 404 || response.status >= 500) {
          fail(`${tool.id}: official docs returned HTTP ${response.status}`);
        } else if (response.status >= 400) {
          warnings.push(`${tool.id}: docs returned HTTP ${response.status}`);
        }
      } catch (error) {
        fail(`${tool.id}: docs request failed (${error.message})`);
      }
    })());

    if (tool.registry) {
      const encoded = encodeURIComponent(tool.registry.name);
      const url = tool.registry.type === 'npm'
        ? `https://registry.npmjs.org/${encoded}/latest`
        : `https://pypi.org/pypi/${encoded}/json`;
      checks.push((async () => {
        try {
          const response = await fetchWithTimeout(url);
          if (response.status === 404 || response.status >= 500) {
            fail(`${tool.id}: ${tool.registry.type} package ${tool.registry.name} returned HTTP ${response.status}`);
          } else if (response.status >= 400) {
            warnings.push(`${tool.id}: registry returned HTTP ${response.status}`);
          }
        } catch (error) {
          fail(`${tool.id}: registry request failed (${error.message})`);
        }
      })());
    }
  }
  await Promise.all(checks);
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`error: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`AI CLI catalog OK: ${catalog.tools.length} tools${network ? ' (official sources checked)' : ''}`);
}
