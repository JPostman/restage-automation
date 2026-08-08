import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import type { Browser, BrowserContext, Frame, Page } from 'playwright-core';
import { ReStage } from './restage.js';
import { Resources } from './resources.js';
import { WizardTest } from './tests/wizard.test.js';
import { ActionsTest } from './tests/actions.test.js';
import { SchemaTest } from './tests/schema.test.js';
import { EnvironmentTest } from './tests/environment.test.js';
import { RmlTest } from './tests/rml.test.js';

const TIMEOUT_MS = 60_000;
const ACTION_DELAY_MS = Number(process.env.RESTAGE_ACTION_DELAY_MS ?? '1000');
const PROJECT_ROOT = process.cwd();
const VSIX_PATH = path.join(PROJECT_ROOT, 'restage-studio.vsix');
const TEMP_ROOT = process.env.TEMP || process.env.TMPDIR || process.env.TMP || os.tmpdir();
const DEMO_PROJECT = path.join(TEMP_ROOT, 'restage-demo');
const RUN_ROOT = path.join(TEMP_ROOT, `restage-automation-${process.pid}-${Date.now()}`);
const USER_DATA_DIR = path.join(RUN_ROOT, 'vscode');
const EXTENSIONS_DIR = path.join(RUN_ROOT, 'extensions');
const VSCODE_SETTINGS = path.join(PROJECT_ROOT, '.vscode', 'settings.json');
const RUNTIME_STATE = path.join(PROJECT_ROOT, '.restage-automation.json');
const INSPECTABLE_SELECTOR = ['[data-testid]', 'button', 'input', 'textarea', 'select', 'a', '[role]'].join(', ');

type TestTarget = 'all' | 'wizard' | 'actions' | 'schema' | 'environment' | 'rml';

function testTarget(): TestTarget {
  const value = (process.env.RESTAGE_TEST_TARGET ?? 'all').trim().toLowerCase();
  const supported: TestTarget[] = ['all', 'wizard', 'actions', 'schema', 'environment', 'rml'];
  if (!supported.includes(value as TestTarget)) {
    throw new Error(`Unsupported RESTAGE_TEST_TARGET: ${value}`);
  }
  return value as TestTarget;
}

function log(message: string): void {
  console.log(`[ReSTage Automation] ${message}`);
}

const BENIGN_VSCODE_LOG_PATTERNS: RegExp[] = [
  /remote-debugging-port.*not in the list of known options/i,
  /StorageMainService:/i,
  /\[shared storage\]/i,
  /update#setState/i,
  /\[DEP0169\]/i,
  /Use `Code --trace-deprecation/i,
  /Extension host with pid .* exited with code:\s*0\b/i,
  /Unknown channel:\s*agentHostClientProxy/i,
];

function isImportantVsCodeLog(line: string): boolean {
  if (!line) return false;
  if (BENIGN_VSCODE_LOG_PATTERNS.some((pattern) => pattern.test(line))) return false;

  if (/exited with code:\s*(?!0\b)\d+/i.test(line)) return true;
  return /\b(error|failed|failure|fatal|uncaught|exception|crash(?:ed)?|ENOENT|EPERM|EACCES)\b/i.test(line);
}

function vscodeLogSink(): (data: Buffer | string) => void {
  let pending = '';

  return (data: Buffer | string): void => {
    pending += String(data);
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (isImportantVsCodeLog(line)) {
        console.error(`[ReSTage Automation] [VS Code Error] ${line}`);
      }
    }
  };
}

function cleanEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function firstExisting(candidates: Array<string | undefined>): string | undefined {
  return candidates.find((candidate) => Boolean(candidate && fs.existsSync(candidate)));
}

function discoverVsCode(): string {
  const override = process.env.VSCODE_PATH?.trim();
  if (override) {
    if (!fs.existsSync(override)) throw new Error(`VSCODE_PATH does not exist: ${override}`);
    return path.resolve(override);
  }

  if (process.platform === 'win32') {
    const candidate = firstExisting([
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe'),
      process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft VS Code', 'Code.exe'),
      process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft VS Code', 'Code.exe'),
    ]);
    if (candidate) return path.resolve(candidate);
  }

  if (process.platform === 'darwin') {
    const candidate = firstExisting([
      '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
      '/Applications/Visual Studio Code.app/Contents/MacOS/Code',
      path.join(os.homedir(), 'Applications', 'Visual Studio Code.app', 'Contents', 'MacOS', 'Electron'),
      path.join(os.homedir(), 'Applications', 'Visual Studio Code.app', 'Contents', 'MacOS', 'Code'),
    ]);
    if (candidate) return path.resolve(candidate);
  }

  if (process.platform === 'linux') {
    const candidate = firstExisting(['/usr/share/code/code', '/usr/bin/code', '/snap/bin/code']);
    if (candidate) return path.resolve(candidate);
  }

  throw new Error('VS Code was not found. Set VSCODE_PATH to the VS Code executable.');
}

function installVsix(): void {
  if (!fs.existsSync(VSIX_PATH)) {
    throw new Error(`Missing ${VSIX_PATH}. Copy your local extension there as restage-studio.vsix.`);
  }

  log(`Installing local ReSTage extension into isolated directory: ${EXTENSIONS_DIR}`);

  const args = ['--extensions-dir', EXTENSIONS_DIR, '--install-extension', VSIX_PATH, '--force'];

  const result =
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'code', ...args], {
          cwd: PROJECT_ROOT,
          env: cleanEnvironment(),
          stdio: 'inherit',
          shell: false,
        })
      : spawnSync('code', args, {
          cwd: PROJECT_ROOT,
          env: cleanEnvironment(),
          stdio: 'inherit',
          shell: false,
        });

  if (result.error) {
    throw new Error(`Could not run the VS Code 'code' command. Ensure it is on PATH. ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`VSIX installation failed with exit code ${result.status ?? '<unknown>'}.`);
  }
}
function readWorkspaceReStageSettings(): Record<string, unknown> {
  if (!fs.existsSync(VSCODE_SETTINGS)) {
    return {};
  }

  try {
    const settings = JSON.parse(fs.readFileSync(VSCODE_SETTINGS, 'utf8')) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith('restageStudio.')));
  } catch (error) {
    throw new Error(`Could not read ReSTage settings from ${VSCODE_SETTINGS}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function prepareTempProject(): void {
  fs.rmSync(DEMO_PROJECT, { recursive: true, force: true });
  fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });

  const userDir = path.join(USER_DATA_DIR, 'User');
  fs.mkdirSync(userDir, { recursive: true });

  // Copy ReSTage workspace settings into this run's isolated VS Code user profile.
  // Generate Project opens restage-demo as a new workspace; user-level settings keep
  // remote-engine mode active across that workspace reload.
  const restageSettings = readWorkspaceReStageSettings();
  const userSettings = {
    'security.workspace.trust.enabled': false,
    'workbench.startupEditor': 'none',
    'window.restoreWindows': 'none',
    'restageStudio.openSidebarOnStartup': false,
    'chat.disableAIFeatures': true,
    'extensions.autoCheckUpdates': false,
    'extensions.autoUpdate': false,
    'extensions.ignoreRecommendations': true,
    ...restageSettings,
  };

  fs.writeFileSync(path.join(userDir, 'settings.json'), `${JSON.stringify(userSettings, null, 2)}\n`, 'utf8');

  log(`Deleted temporary project if present: ${DEMO_PROJECT}`);
  log(`Using isolated run directory: ${RUN_ROOT}`);
  log(`Using isolated extension directory: ${EXTENSIONS_DIR}`);
  log('Normal user extensions are excluded; VS Code AI/Chat is disabled for this automation profile.');

  if (restageSettings['restageStudio.engine.mode'] === 'remote') {
    log(`Remote ReSTage engine preserved in isolated user profile: ${String(restageSettings['restageStudio.engine.serverUrl'] ?? '<default>')}`);
  }
}

async function freePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a CDP port.'));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function waitUntil<T>(probe: () => Promise<T | null>, message: string): Promise<T> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value !== null) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(message);
}

async function workbenchPage(browser: Browser): Promise<Page> {
  return await waitUntil(async () => {
    const pages = browser.contexts().flatMap((context: BrowserContext) => context.pages());
    for (const page of pages) {
      if (page.isClosed()) continue;
      if (
        await page
          .locator('.monaco-workbench')
          .count()
          .catch(() => 0)
      )
        return page;
    }
    return null;
  }, 'Connected to VS Code CDP, but the workbench page was not found.');
}

async function frameContaining(page: Page, selector: string): Promise<Frame | null> {
  for (const frame of page.frames()) {
    try {
      if ((await frame.locator(selector).count()) > 0) return frame;
    } catch {
      // VS Code can replace webview frames while a view is opening.
    }
  }
  return null;
}

async function waitForFrameContaining(page: Page, selector: string, timeout: number): Promise<Frame | null> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const frame = await frameContaining(page, selector);
    if (frame) return frame;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return null;
}

async function openReStage(restage: ReStage): Promise<Frame> {
  const page = restage.page;
  const existingWizard = await frameContaining(page, '#projectFolder');
  if (existingWizard) {
    log('ReSTage Project Wizard is already open.');
    return existingWizard;
  }

  // Use a stable locator instead of locator('[aria-label]').nth(...).
  // VS Code is still rendering during startup, so an nth() index can move
  // between finding the ReSTage icon and Playwright actually clicking it.
  const activityItem = page.locator('[aria-label="ReSTage"]:visible');
  await activityItem.waitFor({ state: 'visible', timeout: TIMEOUT_MS });

  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    // The wizard may finish opening between retry attempts. Do not toggle the
    // Activity Bar item closed if it has appeared in the meantime.
    const wizardBeforeClick = await frameContaining(page, '#projectFolder');
    if (wizardBeforeClick) {
      log(`Opened ReSTage Project Wizard before attempt ${attempt}.`);
      return wizardBeforeClick;
    }

    log(`Opening ReSTage (attempt ${attempt}/${attempts})...`);
    await restage.click(activityItem);

    const wizard = await waitForFrameContaining(page, '#projectFolder', attempt === attempts ? TIMEOUT_MS : 20_000);

    if (wizard) {
      log(`Opened ReSTage Project Wizard on attempt ${attempt}.`);
      return wizard;
    }

    if (attempt < attempts) {
      log('Project Wizard did not appear; clicking the ReSTage icon again.');
    }
  }

  throw new Error(`Project Wizard with #projectFolder was not found after ${attempts} ReSTage icon clicks.`);
}

function writeRuntimeState(cdpEndpoint: string, playwrightEndpoint: string, vscodePid: number | undefined): void {
  fs.writeFileSync(
    RUNTIME_STATE,
    `${JSON.stringify(
      {
        ownerPid: process.pid,
        vscodePid: vscodePid ?? null,
        cdpEndpoint,
        playwrightEndpoint,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function clearRuntimeState(): void {
  try {
    if (!fs.existsSync(RUNTIME_STATE)) return;
    const state = JSON.parse(fs.readFileSync(RUNTIME_STATE, 'utf8')) as {
      ownerPid?: number;
    };
    if (state.ownerPid === process.pid) fs.rmSync(RUNTIME_STATE, { force: true });
  } catch {
    // Runtime state is best-effort cleanup only.
  }
}

async function waitForVsCodeToClose(cdpEndpoint: string): Promise<void> {
  log('READY. VS Code will stay running. Run `npm run inspect` anytime, including while this process is stopped on a debugger breakpoint.');
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const response = await fetch(`${cdpEndpoint}/json/version`);
      if (!response.ok) return;
    } catch {
      return;
    }
  }
}

function cleanupRunDirectory(): void {
  try {
    fs.rmSync(RUN_ROOT, { recursive: true, force: true });
    log(`Deleted isolated run directory: ${RUN_ROOT}`);
  } catch (error) {
    // Windows may keep a VS Code file handle briefly after process exit.
    // A future run uses a different directory, so cleanup failure is harmless.
    log(`Could not delete isolated run directory yet: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main(): Promise<void> {
  // Keep Playwright's very verbose pw:api debug channel disabled.
  delete process.env.DEBUG;

  // Keep Inspector disabled during the normal test run.
  // Inspector remains disabled during normal actions and opens only on request or after tests complete.
  delete process.env.PWDEBUG;
  const { chromium } = await import('playwright-core');

  prepareTempProject();
  installVsix();

  const vscodePath = discoverVsCode();
  const cdpPort = await freePort();
  const args = [
    '--new-window',
    `--user-data-dir=${USER_DATA_DIR}`,
    `--extensions-dir=${EXTENSIONS_DIR}`,
    '--disable-workspace-trust',
    '--disable-telemetry',
    '--skip-welcome',
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${cdpPort}`,
  ];

  // Only open this repository as a VS Code workspace when it has local
  // .vscode/settings.json. This makes the workspace settings the opt-in switch
  // for ReSTage remote-engine mode. Without the file, VS Code starts without
  // this workspace and ReSTage uses its normal/default (local) configuration.
  if (fs.existsSync(VSCODE_SETTINGS)) {
    args.push(PROJECT_ROOT);
    log(`Workspace settings found: ${VSCODE_SETTINGS}`);
    log('ReSTage workspace configuration enabled (remote mode can be read from .vscode/settings.json).');
  } else {
    log('No .vscode/settings.json found; launching without workspace settings so ReSTage uses its default/local configuration.');
  }

  if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0) {
    args.unshift('--no-sandbox');
  }

  log(`Launching VS Code: ${vscodePath}`);
  const child: ChildProcess = spawn(vscodePath, args, {
    cwd: PROJECT_ROOT,
    env: cleanEnvironment(),
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdoutLog = vscodeLogSink();
  const stderrLog = vscodeLogSink();
  child.stdout?.on('data', stdoutLog);
  child.stderr?.on('data', stderrLog);

  const cdpEndpoint = `http://127.0.0.1:${cdpPort}`;
  await waitUntil(async () => {
    if (child.exitCode !== null) throw new Error(`VS Code exited early with code ${child.exitCode}.`);
    try {
      const response = await fetch(`${cdpEndpoint}/json/version`);
      return response.ok ? true : null;
    } catch {
      return null;
    }
  }, `VS Code did not expose CDP at ${cdpEndpoint}.`);

  const browser = await chromium.connectOverCDP(cdpEndpoint, {
    timeout: TIMEOUT_MS,
    slowMo: ACTION_DELAY_MS,
  });

  // Re-export this exact Playwright Browser over the Playwright protocol.
  // The Inspector connects to this endpoint instead of opening a second raw
  // CDP connection, so VS Code webview/OOPIF frame information is preserved.
  const browserBinding = await browser.bind(`restage-automation-${process.pid}`, {
    host: '127.0.0.1',
    port: 0,
    workspaceDir: PROJECT_ROOT,
  });
  log(`Playwright Inspector endpoint published: ${browserBinding.endpoint}`);

  let restage: ReStage | undefined;

  try {
    const page = await workbenchPage(browser);
    restage = new ReStage(page, openInspector);
    const resources = new Resources();

    writeRuntimeState(cdpEndpoint, browserBinding.endpoint, child.pid);
    const wizard = await openReStage(restage);

    const projectFolder = wizard.locator('#projectFolder');
    await projectFolder.waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    await restage.fill(projectFolder, DEMO_PROJECT);

    log(`Project folder entered: ${DEMO_PROJECT}`);

    const wizardTest = new WizardTest(restage);
    const actionsTest = new ActionsTest(restage);
    const schemaTest = new SchemaTest(restage, resources);
    const environmentTest = new EnvironmentTest(restage);
    const rmlTest = new RmlTest(restage);
    const target = testTarget();

    log(`Test target: ${target === 'all' ? 'all tests' : target}`);

    await wizardTest.init();
    if (target === 'wizard') {
      log('WizardTest completed.');
      return;
    }

    await actionsTest.init();
    if (target === 'actions') {
      log('ActionsTest completed.');
      return;
    }

    await schemaTest.init();
    await schemaTest.changeLabel(0, 0, 'Get Auth User');
    await schemaTest.changeLabel(0, 1, 'Login user');
    await schemaTest.changeLabel(0, 2, 'Refresh token');
    await schemaTest.openOperation(0, 1);
    await schemaTest.changeVariable(0, 1, '"emilys"');
    await schemaTest.changeBody(
      0,
      1,
      '{ "username" : "{{username}}", "password" : "emilyspass", "expiresInMins" : 30 }',
      '{\n  "username" : "{{username}}",\n  "password" : "{{password}}",\n  "expiresInMins" : {{expiresInMins}}\n}',
    );
    if (target === 'schema') {
      log('SchemaTest completed.');
      return;
    }

    await environmentTest.init();
    if (target === 'environment') {
      log('EnvironmentTest completed.');
      return;
    }

    await rmlTest.init();
    if (target === 'rml') {
      log('RmlTest completed.');
      return;
    }

    await actionsTest.toggleAIMesssageBot();
    await actionsTest.runTestWithAIEngine();
    await actionsTest.runMavenTest();

    log('All tests completed. Opening Playwright Inspector in the original Playwright session.');
    log('You can also run `npm run inspect` while the automation VS Code window is running.');

    // Keep Inspector on the same Playwright connection that created and already
    // sees the VS Code webviews. This allows the locator picker to traverse the
    // ReSTage API Schema frame instead of attaching a second CDP session.
    await restage.inspect();

    log('Inspector closed. VS Code will remain open until you close the automation window.');
    await waitForVsCodeToClose(cdpEndpoint);
  } catch (error: unknown) {
    console.error(`[ReSTage Automation] FAILED: ${error instanceof Error ? error.stack || error.message : String(error)}`);
    process.exitCode = 1;

    // Do not tear down the browser on a test failure. Keep the exact failed UI
    // state alive, open Playwright Inspector, and let the user investigate.
    if (restage && child.exitCode === null) {
      log('Failure detected. Keeping VS Code and the Playwright session alive.');
      log('Opening Playwright Inspector at the failed state. Press Resume when you are done inspecting.');

      try {
        await restage.inspect();
        log('Failure Inspector resumed/closed. VS Code will remain open until you close the automation window.');
      } catch (inspectorError: unknown) {
        console.error(`[ReSTage Automation] Failure Inspector could not open: ${inspectorError instanceof Error ? inspectorError.stack || inspectorError.message : String(inspectorError)}`);
        log('VS Code will still remain open so the failed state is not terminated automatically.');
      }

      await waitForVsCodeToClose(cdpEndpoint);
    }
  } finally {
    clearRuntimeState();

    try {
      await browser.unbind();
    } catch {
      // Binding may already be gone if VS Code closed.
    }

    try {
      await browser.close();
    } catch {
      // CDP can disconnect while VS Code is closing.
    }

    if (child.exitCode === null && child.pid) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          shell: false,
        });
      } else {
        child.kill('SIGTERM');
      }
    }

    cleanupRunDirectory();
  }
}

await main().catch((error: unknown) => {
  console.error(`[ReSTage Automation] FAILED: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});

/**
 * Opens Playwright Inspector in a helper process connected to the browser
 * binding published by this automation session. The helper exits only after
 * Inspector is resumed/closed, so callers can safely await this function.
 */
async function openInspector(): Promise<void> {
  const inspectorScript = path.join(PROJECT_ROOT, 'dist', 'src', 'inspect.js');
  if (!fs.existsSync(inspectorScript)) {
    throw new Error(`Inspector helper was not built: ${inspectorScript}`);
  }

  const inspectorEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PWDEBUG: '1',
  };

  // Do not inherit VS Code js-debug configuration in the helper process.
  delete inspectorEnv.NODE_OPTIONS;
  delete inspectorEnv.VSCODE_INSPECTOR_OPTIONS;
  delete inspectorEnv.NODE_INSPECT_RESUME_ON_START;

  log('Opening Playwright Inspector.');

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const settle = (error?: Error): void => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    const inspector = spawn(process.execPath, [inspectorScript], {
      cwd: PROJECT_ROOT,
      env: inspectorEnv,
      stdio: 'inherit',
      shell: false,
    });

    inspector.once('error', (error) => {
      settle(new Error(`Playwright Inspector could not start: ${error.message}`));
    });

    inspector.once('exit', (code, signal) => {
      if (code === 0) {
        settle();
        return;
      }

      settle(new Error(`Playwright Inspector exited unexpectedly (code=${code ?? '<none>'}, signal=${signal ?? '<none>'}).`));
    });
  });
}
