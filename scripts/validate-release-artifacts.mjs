#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length);
  }

  const index = process.argv.indexOf(name);
  if (index !== -1) {
    return process.argv[index + 1];
  }

  return undefined;
}

const packageJson = readJson('package.json');
const version = getArgValue('--version') ?? process.env.RELEASE_VERSION ?? packageJson.version;
const artifactDir = getArgValue('--dir') ?? process.env.ARTIFACT_DIR ?? `/tmp/dev-janitor-v${version}`;
const expectedCount = Number(getArgValue('--expected-count') ?? process.env.EXPECTED_ARTIFACT_COUNT ?? 22);
const releaseTag = `v${version}`;
const failures = [];

function fail(message) {
  failures.push(message);
}

function filePath(name) {
  return join(artifactDir, name);
}

function hasNonEmptyFile(name) {
  const path = filePath(name);
  if (!existsSync(path)) {
    fail(`missing artifact: ${name}`);
    return false;
  }

  const stat = statSync(path);
  if (!stat.isFile()) {
    fail(`not a file: ${name}`);
    return false;
  }

  if (stat.size === 0) {
    fail(`empty artifact: ${name}`);
    return false;
  }

  return true;
}

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`version format: expected semantic version, got ${version}`);
}

if (!existsSync(artifactDir)) {
  fail(`artifact directory does not exist: ${artifactDir}`);
} else if (!statSync(artifactDir).isDirectory()) {
  fail(`artifact path is not a directory: ${artifactDir}`);
}

const expectedArtifacts = [
  `Dev-Janitor_${version}_x64_portable.zip`,
  `Dev.Janitor-${version}-1.x86_64.rpm`,
  `Dev.Janitor-${version}-1.x86_64.rpm.sig`,
  `Dev.Janitor_${version}_aarch64.dmg`,
  `Dev.Janitor_${version}_amd64.AppImage`,
  `Dev.Janitor_${version}_amd64.AppImage.sig`,
  `Dev.Janitor_${version}_amd64.deb`,
  `Dev.Janitor_${version}_amd64.deb.sig`,
  `Dev.Janitor_${version}_x64-setup.exe`,
  `Dev.Janitor_${version}_x64-setup.exe.sig`,
  `Dev.Janitor_${version}_x64.dmg`,
  `Dev.Janitor_${version}_x64_en-US.msi`,
  `Dev.Janitor_${version}_x64_en-US.msi.sig`,
  `Dev.Janitor_${version}_x64_ja-JP.msi`,
  `Dev.Janitor_${version}_x64_ja-JP.msi.sig`,
  `Dev.Janitor_${version}_x64_zh-CN.msi`,
  `Dev.Janitor_${version}_x64_zh-CN.msi.sig`,
  'Dev.Janitor_aarch64.app.tar.gz',
  'Dev.Janitor_aarch64.app.tar.gz.sig',
  'Dev.Janitor_x64.app.tar.gz',
  'Dev.Janitor_x64.app.tar.gz.sig',
  'latest.json',
];

let artifactNames = [];
if (existsSync(artifactDir) && statSync(artifactDir).isDirectory()) {
  artifactNames = readdirSync(artifactDir).filter((name) => statSync(filePath(name)).isFile()).sort();
}

if (artifactNames.length !== expectedCount) {
  fail(`artifact count: expected ${expectedCount}, got ${artifactNames.length}`);
}

for (const name of expectedArtifacts) {
  hasNonEmptyFile(name);
}

const expectedSet = new Set(expectedArtifacts);
const unexpectedArtifacts = artifactNames.filter((name) => !expectedSet.has(name));
if (unexpectedArtifacts.length > 0) {
  fail(`unexpected artifacts: ${unexpectedArtifacts.join(', ')}`);
}

const missingSignatures = [
  `Dev.Janitor-${version}-1.x86_64.rpm`,
  `Dev.Janitor_${version}_amd64.AppImage`,
  `Dev.Janitor_${version}_amd64.deb`,
  `Dev.Janitor_${version}_x64-setup.exe`,
  `Dev.Janitor_${version}_x64_en-US.msi`,
  `Dev.Janitor_${version}_x64_ja-JP.msi`,
  `Dev.Janitor_${version}_x64_zh-CN.msi`,
  'Dev.Janitor_aarch64.app.tar.gz',
  'Dev.Janitor_x64.app.tar.gz',
]
  .filter((name) => !hasNonEmptyFile(`${name}.sig`));

if (missingSignatures.length > 0) {
  fail(`missing signatures for: ${missingSignatures.join(', ')}`);
}

if (hasNonEmptyFile('latest.json')) {
  const latestJsonPath = filePath('latest.json');
  let latestJson;
  try {
    latestJson = JSON.parse(readFileSync(latestJsonPath, 'utf8'));
  } catch (error) {
    fail(`latest.json parse failed: ${error.message}`);
  }

  if (latestJson) {
    if (latestJson.version !== version) {
      fail(`latest.json version: expected ${version}, got ${latestJson.version}`);
    }

    const platforms = latestJson.platforms;
    if (!platforms || typeof platforms !== 'object' || Array.isArray(platforms)) {
      fail('latest.json platforms: expected object');
    } else {
      const expectedPlatforms = [
        'darwin-x86_64',
        'darwin-x86_64-app',
        'darwin-aarch64',
        'darwin-aarch64-app',
        'linux-x86_64',
        'linux-x86_64-appimage',
        'linux-x86_64-deb',
        'linux-x86_64-rpm',
        'windows-x86_64',
        'windows-x86_64-msi',
        'windows-x86_64-nsis',
      ];

      for (const key of expectedPlatforms) {
        const entry = platforms[key];
        if (!entry) {
          fail(`latest.json platforms.${key}: missing`);
          continue;
        }

        if (typeof entry.signature !== 'string' || entry.signature.length === 0) {
          fail(`latest.json platforms.${key}.signature: missing`);
        }

        if (typeof entry.url !== 'string' || entry.url.length === 0) {
          fail(`latest.json platforms.${key}.url: missing`);
          continue;
        }

        if (!entry.url.includes(`/releases/download/${releaseTag}/`)) {
          fail(`latest.json platforms.${key}.url: expected ${releaseTag} URL, got ${entry.url}`);
        }

        let assetName;
        try {
          assetName = basename(decodeURIComponent(new URL(entry.url).pathname));
        } catch (error) {
          fail(`latest.json platforms.${key}.url: invalid URL (${error.message})`);
          continue;
        }

        hasNonEmptyFile(assetName);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Release artifact validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Release artifact validation passed for ${releaseTag}: ${artifactNames.length} files in ${artifactDir}`);
