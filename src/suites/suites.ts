import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { defineConfig, test as base, type TestInfo } from '@playwright/test';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { chromium } from 'playwright-core';
import { ReStage } from '../restage.js';
import { Wizard } from './base/wizard.js';
import { Resources } from '../resources.js';
import { suiteProjects, testTarget } from './suite-config.js';
export { testTarget } from './suite-config.js';

const TIMEOUT_MS = 90_000;
const PROJECT_ROOT = process.cwd();
const TEMP_ROOT = process.env.TEMP || process.env.TMPDIR || process.env.TMP || os.tmpdir();
const DEMO_PROJECT = path.join(TEMP_ROOT, 'restage-demo');
const RUNTIME_STATE = path.join(PROJECT_ROOT, '.restage-automation.json');
const STOP_FILE = path.join(PROJECT_ROOT, '.restage-test-stop');
const TEST_RUNNER_PID_ENV = 'RESTAGE_TEST_RUNNER_PID';

function actionDelayMs(): number {
  const value = Number(process.env.RESTAGE_ACTION_DELAY_MS ?? '0');
  return Number.isFinite(value) && value > 0 ? value : 0;
}

// The Playwright config is loaded in the runner before workers are spawned.
// Preserve that runner PID in the inherited environment so the shared ReSTage
// session can stay alive across worker restarts/projects and shut down only
// after the full Playwright run exits.
if (!process.env[TEST_RUNNER_PID_ENV] && process.env.TEST_WORKER_INDEX === undefined) {
  process.env[TEST_RUNNER_PID_ENV] = String(process.pid);
}

function log(message: string): void {
  console.log(`[Suites] ${message}`);
}

export class TestSuites {
  static readonly SUITE_1 = 'suite1' as const;
  static readonly SUITE_2 = 'suite2' as const;
  static readonly SUITE_3 = 'suite3' as const;
}

type RuntimeState = {
  ownerPid?: number;
  runnerPid?: number;
  cdpEndpoint?: string;
  playwrightEndpoint?: string;
};

type WorkerFixtures = {
  restage: ReStage;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessRunning(pid?: number): boolean {
  if (!pid) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readRuntimeState(): RuntimeState | undefined {
  if (!fs.existsSync(RUNTIME_STATE)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(RUNTIME_STATE, 'utf8')) as RuntimeState;
  } catch {
    return undefined;
  }
}

function currentRunnerPid(): number | undefined {
  const value = Number(process.env[TEST_RUNNER_PID_ENV] ?? '');
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

async function runtimeStateUsable(state: RuntimeState | undefined): Promise<boolean> {
  const runnerPid = currentRunnerPid();
  if (!runnerPid || state?.runnerPid !== runnerPid) return false;
  if (!state.ownerPid || !state.cdpEndpoint || !isProcessRunning(state.ownerPid)) return false;

  try {
    const response = await fetch(`${state.cdpEndpoint}/json/version`, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForRuntimeState(ownerPid?: number): Promise<RuntimeState> {
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const state = readRuntimeState();
    if (state?.playwrightEndpoint && (ownerPid === undefined || state.ownerPid === ownerPid)) {
      return state;
    }
    await delay(250);
  }

  throw new Error('Timed out waiting for the ReSTage Playwright session to become ready.');
}

async function waitForRuntimeStateToDisappear(timeout = 30_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!fs.existsSync(RUNTIME_STATE)) return;
    await delay(250);
  }
}

async function stopSession(): Promise<void> {
  if (!fs.existsSync(RUNTIME_STATE)) return;

  fs.writeFileSync(STOP_FILE, 'stop\n', 'utf8');
  await waitForRuntimeStateToDisappear();
  fs.rmSync(STOP_FILE, { force: true });
}

async function startSession(sessionTarget: string): Promise<ChildProcess> {
  const existingState = readRuntimeState();
  if (existingState) {
    if (isProcessRunning(existingState.ownerPid)) {
      await stopSession();
    } else {
      // Stale runtime files must not make the next run wait 30 seconds.
      fs.rmSync(RUNTIME_STATE, { force: true });
      fs.rmSync(STOP_FILE, { force: true });
    }
  }

  fs.rmSync(STOP_FILE, { force: true });
  fs.rmSync(RUNTIME_STATE, { force: true });

  const child = spawn(process.execPath, ['--enable-source-maps', path.join(PROJECT_ROOT, 'dist', 'src', 'main.js')], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      RESTAGE_SESSION_ONLY: '1',
      RESTAGE_TEST_TARGET: sessionTarget,
    },
    stdio: 'inherit',
    shell: false,
  });

  child.once('error', (error) => {
    console.error(`[Suites] ReSTage session process error: ${error.message}`);
  });

  await waitForRuntimeState(child.pid);
  child.unref();
  return child;
}

async function workbenchPage(browser: Browser): Promise<Page> {
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const pages = browser.contexts().flatMap((context: BrowserContext) => context.pages());
    for (const page of pages) {
      if (page.isClosed()) continue;
      const count = await page
        .locator('.monaco-workbench')
        .count()
        .catch(() => 0);
      if (count > 0) return page;
    }
    await delay(250);
  }

  throw new Error('Connected to the ReSTage Playwright session, but the VS Code workbench page was not found.');
}

async function openInspector(): Promise<void> {
  const inspectorScript = path.join(PROJECT_ROOT, 'dist', 'src', 'inspect.js');
  if (!fs.existsSync(inspectorScript)) {
    throw new Error(`Inspector helper was not built: ${inspectorScript}`);
  }

  const env: NodeJS.ProcessEnv = { ...process.env, PWDEBUG: '1' };
  delete env.NODE_OPTIONS;
  delete env.VSCODE_INSPECTOR_OPTIONS;
  delete env.NODE_INSPECT_RESUME_ON_START;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [inspectorScript], {
      cwd: PROJECT_ROOT,
      env,
      stdio: 'inherit',
      shell: false,
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      // 0xC000013A is Windows STATUS_CONTROL_C_EXIT. Closing an Inspector
      // window can end the helper this way; it does not mean the test error
      // itself was lost.
      if (code === 0 || (process.platform === 'win32' && code === 0xc000013a)) resolve();
      else reject(new Error(`Playwright Inspector exited unexpectedly (code=${code ?? '<none>'}, signal=${signal ?? '<none>'}).`));
    });
  });
}

function inspectOnFailure(): boolean {
  return process.env.RESTAGE_INSPECT_ON_FAILURE === '1';
}

function inspectOnComplete(): boolean {
  return process.env.RESTAGE_INSPECT_ON_COMPLETE === '1';
}

let testFailureReported = false;

/**
 * Keeps "ReSTage: Debug Test Class" inside an active Playwright hook while
 * the completion Inspector is open. This is deliberately NOT run from a
 * worker-fixture teardown: once Playwright starts stopping a worker it only
 * waits a bounded amount of time for that worker to exit, which conflicts
 * with an Inspector that the developer may intentionally leave open forever.
 */
export async function inspectTestClassOnComplete(restage: ReStage, testInfo: TestInfo): Promise<void> {
  if (!inspectOnComplete() || testFailureReported) return;

  // beforeAll/afterAll have their own timeout. Zero means this completion hook
  // may wait for the developer indefinitely; closing/resuming Inspector lets
  // the hook finish and normal worker teardown then continues.
  testInfo.setTimeout(0);

  log('Test class finished; opening Playwright Inspector. Close/Resume Inspector to continue shutdown.');
  try {
    await restage.inspect();
  } catch (error) {
    console.error(`[Suites] Completion Inspector could not open: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  }
}

export async function reportTestFailure(restage: ReStage, testInfo: TestInfo): Promise<void> {
  if (testInfo.status === testInfo.expectedStatus || testInfo.status === 'skipped') return;

  testFailureReported = true;
  console.error(`\n[Test] FAIL: ${testInfo.title}`);

  // Print the original error stack before optionally opening Inspector so the
  // terminal always keeps the TypeScript line and its caller chain.
  if (testInfo.errors.length === 0) {
    console.error('[Test] No Playwright error stack was reported.');
  } else {
    for (const [index, error] of testInfo.errors.entries()) {
      const label = testInfo.errors.length > 1 ? `Error ${index + 1}` : 'Error';
      const details = error.stack ?? error.message ?? error.value ?? 'Unknown test failure';
      console.error(`[Test] ${label}:\n${details}`);
    }
  }

  // debugger; // common breakpoint for every failed test

  if (!inspectOnFailure()) {
    console.error('[Test] Inspector disabled for this run. Continuing to the next test.');
    return;
  }

  // Inspector is intentionally interactive and may stay open for as long as
  // the developer needs. Disable the current test/afterEach timeout before
  // waiting for Inspector. Once Inspector is closed/resumed, execution
  // continues normally.
  testInfo.setTimeout(0);

  try {
    await restage.inspect();
  } catch (error) {
    console.error(`[Test] Inspector could not open: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  }
}

export const test = base.extend<{}, WorkerFixtures>({
  restage: [
    async ({}, use, workerInfo) => {
      const projectName = workerInfo.project.name;

      let state = readRuntimeState();
      const canReuse = await runtimeStateUsable(state);

      if (!canReuse) {
        await startSession(projectName);
        state = await waitForRuntimeState();
      } else {
        log(`Reusing the live ReSTage UI/session for worker ${workerInfo.workerIndex} (${projectName}).`);
      }

      if (!state?.cdpEndpoint) {
        throw new Error('The ReSTage session did not publish a CDP endpoint.');
      }

      // Normal tests attach directly to VS Code's persistent CDP endpoint.
      // The browser.bind() endpoint is reserved for Playwright Inspector only.
      // This lets a new Playwright worker/project reconnect without closing or
      // invalidating the ReSTage UI between tests/suites.
      const delayMs = actionDelayMs();
      if (delayMs > 0) {
        log(`Action delay enabled: ${delayMs}ms`);
      }

      const browser = await chromium.connectOverCDP(state.cdpEndpoint, {
        timeout: TIMEOUT_MS,
        isLocal: true,
        slowMo: delayMs,
      });

      const page = await workbenchPage(browser);
      const restage = new ReStage(DEMO_PROJECT, page, testTarget, openInspector);
      const notification = page.getByRole('button', { name: 'Do Not Disturb' });

      await restage.sleep(1_000);
      try {
        // Disable notidications
        if (!(await restage.visible(notification))) {
          await restage.click(page.getByRole('button', { name: 'Notifications' }));
          const doNotDisturb = page.getByRole('button', { name: 'Configure Do Not Disturb...' });
          if ((await restage.exists(doNotDisturb)) && (await doNotDisturb.isVisible())) {
            await restage.click(doNotDisturb);
          }
          const enableDoNotDisturb = page.getByRole('menuitem', { name: 'Enable Do Not Disturb Mode' });
          if ((await restage.exists(enableDoNotDisturb)) && (await enableDoNotDisturb.isVisible())) {
            await restage.click(enableDoNotDisturb);
          }
        }

        await use(restage);
      } finally {
        // Completion Inspector is handled by each suite's afterAll hook while
        // Playwright still considers the suite active. Do not block worker
        // teardown on user interaction. The session owner watches the runner
        // PID and shuts the UI down only after the whole Playwright run exits.
        log(`Worker ${workerInfo.workerIndex} finished; keeping the ReSTage UI/session alive until runner shutdown.`);
      }

      try {
        // Enable notidications
        await restage.click(notification);
        await restage.click(page.getByRole('button', { name: 'Configure Do Not Disturb...' }));
        await restage.click(page.getByRole('menuitem', { name: 'Disable Do Not Disturb Mode' }));
      } finally {
        log(`Notidications restore.`);
      }
    },
    { scope: 'worker', timeout: 180_000 },
  ],
});

export async function prepareTestContext(restage: ReStage, suite: string): Promise<void> {
  log(`Test target: ${testTarget()} (${suite})`);

  const activityItem = restage.page.locator('[aria-label="ReSTage"].uri-icon:visible').first();
  await restage.waitVisible(activityItem);
  await restage.click(activityItem);

  const actions = restage.page.getByRole('button', { name: 'Actions Section' });
  const timeout = suite == TestSuites.SUITE_1 ? 1_000 : 5_000;
  const projectExists = await restage.waitExists(actions, timeout);
  if (projectExists) {
    const resources = new Resources(restage);
    const file = restage.page.getByRole('tab', { name: Resources.DEFAULT_FILE });
    if (await restage.exists(file)) {
      await restage.click(file.getByLabel('Close (Ctrl+F4)')); // Close current java file
    }
    resources.writePath(resources.main(), resources.tempate() + '}'); // Rewrite
    await restage.toogleApiSchema();

    const input = restage.page.locator('.quick-input-widget input');
    await restage.page.keyboard.press('Control+p'); // "Quick Open"
    await input.waitFor({ state: 'visible' });
    await input.fill(resources.main()); // File path
    await input.press('Enter'); // Open file
    await restage.waitExists(file);

    const closeButton = restage.page.getByRole('button', { name: 'Hide Panel (Ctrl+J)' });
    if (await restage.exists(closeButton)) {
      await restage.click(closeButton);
    }
    return;
  }

  await restage.waitFrame('Project Wizard');

  if (suite !== TestSuites.SUITE_1) {
    const wizard = new Wizard(restage);
    await wizard.setProject(restage.rootDir);
    await wizard.openProject();
  }
}

export default defineConfig({
  testDir: '.',
  projects: suiteProjects(),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 600_000,
  reporter: 'list',
});
