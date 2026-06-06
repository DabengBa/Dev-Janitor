#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readText(relativePath) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
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
const releaseTag = getArgValue('--tag') ?? process.env.RELEASE_TAG;
const expectedVersion = releaseTag ? releaseTag.replace(/^v/, '') : packageJson.version;
const expectedDisplayVersion = `v${expectedVersion}`;
const failures = [];

function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(expectedVersion)) {
  failures.push(`version format: expected semantic version, got ${expectedVersion}`);
}

if (releaseTag) {
  if (!/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(releaseTag)) {
    failures.push(`release tag format: expected v-prefixed semantic version, got ${releaseTag}`);
  }
  expect('release tag', releaseTag, expectedDisplayVersion);
}

expect('package.json version', packageJson.version, expectedVersion);

const tauriConfig = readJson('src-tauri/tauri.conf.json');
expect('src-tauri/tauri.conf.json version', tauriConfig.version, expectedVersion);

const cargoToml = readText('src-tauri/Cargo.toml');
const cargoVersion = cargoToml.match(/^version = "([^"]+)"$/m)?.[1];
expect('src-tauri/Cargo.toml version', cargoVersion, expectedVersion);

const englishI18n = readJson('src/i18n/en.json');
expect('src/i18n/en.json app.version', englishI18n.app?.version, expectedDisplayVersion);

const chineseI18n = readJson('src/i18n/zh.json');
expect('src/i18n/zh.json app.version', chineseI18n.app?.version, expectedDisplayVersion);

const changelog = readText('CHANGELOG.md');
if (!new RegExp(`^## \\[${expectedVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'm').test(changelog)) {
  failures.push(`CHANGELOG.md: missing heading for [${expectedVersion}]`);
}

if (failures.length > 0) {
  console.error('Release version validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Release version validation passed for ${expectedDisplayVersion}`);
