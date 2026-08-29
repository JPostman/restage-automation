import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const suitesDirectory = path.dirname(fileURLToPath(import.meta.url));
const suiteExtension = path.extname(fileURLToPath(import.meta.url));

export interface SuiteProject {
  name: string;
  testMatch: string;
  dependencies?: string[];
}

/** Discover siblings of this module, in either the source or compiled tree. */
export function discoverSuites(): SuiteProject[] {
  const suites = fs
    .readdirSync(suitesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^suite\d+$/.test(entry.name))
    .filter((entry) => fs.existsSync(path.join(suitesDirectory, entry.name, `test.suite${suiteExtension}`)))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((entry) => ({
      name: entry.name,
      testMatch: `**/${entry.name}/test.suite${suiteExtension}`,
    }));

  if (suites.length === 0) {
    throw new Error(`No suites found in ${suitesDirectory}. Expected suite<number>/test.suite${suiteExtension}. Run npm run build when using compiled tests.`);
  }
  return suites;
}

export function testTarget(suites: readonly SuiteProject[] = discoverSuites()): string {
  const target = (process.env.RESTAGE_TEST_TARGET ?? 'all').trim().toLowerCase();
  if (target !== 'all' && !suites.some((suite) => suite.name === target)) {
    throw new Error(`Unsupported RESTAGE_TEST_TARGET: "${target}". Available: all, ${suites.map((suite) => suite.name).join(', ')}.`);
  }
  return target;
}

export function suiteProjects(): SuiteProject[] {
  const suites = discoverSuites();
  const target = testTarget(suites);
  if (target !== 'all') return suites.filter((suite) => suite.name === target);

  const continueOnFailure = process.env.RESTAGE_CONTINUE_ON_FAILURE === '1';
  return suites.map((suite, index) => ({
    ...suite,
    ...(!continueOnFailure && index > 0 ? { dependencies: [suites[index - 1].name] } : {}),
  }));
}
