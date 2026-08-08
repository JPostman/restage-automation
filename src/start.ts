import fs from 'node:fs';
import net from 'node:net';
import { createServer, type Server } from 'node:http';
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

function writeRuntimeState(cdpEndpoint: string, vscodePid: number | undefined, inspectorEndpoint: string): void {
  fs.writeFileSync(
    RUNTIME_STATE,
    `${JSON.stringify(
      {
        ownerPid: process.pid,
        vscodePid: vscodePid ?? null,
        cdpEndpoint,
        inspectorEndpoint,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  log(`Inspector control endpoint published: ${inspectorEndpoint}`);
}

async function startInspectorServer(restage: ReStage): Promise<{ server: Server; endpoint: string }> {
  let inspectorBusy = false;

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (request.method !== 'POST' || url.pathname !== '/inspect') {
      response.statusCode = 404;
      response.end('Not found');
      return;
    }

    if (inspectorBusy) {
      response.statusCode = 409;
      response.end('Inspector is already open');
      return;
    }

    const frameTitle = url.searchParams.get('frame')?.trim() || undefined;
    inspectorBusy = true;

    response.statusCode = 202;
    response.end('Inspector requested');

    setImmediate(() => {
      void inspect(restage, frameTitle)
        .catch((error: unknown) => {
          console.error(`[ReSTage Inspector] FAILED: ${error instanceof Error ? error.stack || error.message : String(error)}`);
        })
        .finally(() => {
          inspectorBusy = false;
        });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not start Inspector control server.');
  }

  return {
    server,
    endpoint: `http://127.0.0.1:${address.port}`,
  };
}

async function closeServer(server: Server | undefined): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
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
  log('READY. VS Code will stay running. In another terminal run: npm run inspect');
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

/**
 * Opens Playwright Inspector from the SAME Playwright session that owns VS Code.
 * This matters for VS Code webviews: attaching a second CDP Playwright process can
 * see the editor tab but its locator picker may not instrument an existing webview.
 *
 * When frameTitle is supplied we first verify the webview is present and log how
 * many interactive/testable elements Playwright can already see inside it.
 */
async function inspect(restage: ReStage, frameTitle?: string): Promise<void> {
  if (frameTitle) {
    const frame = await restage.frameByTitle(frameTitle);
    await frame.locator('body').waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    const count = await frame.locator(INSPECTABLE_SELECTOR).count();
    console.log(`[ReSTage Inspector] Target webview: ${frameTitle} (${count} inspectable components visible to Playwright)`);
  } else {
    const summaries: string[] = [];

    for (const frame of restage.page.frames()) {
      if (frame === restage.page.mainFrame() || frame.isDetached()) continue;

      try {
        const iframe = await frame.frameElement();
        const title = (await iframe.getAttribute('title'))?.trim();
        if (!title) continue;

        const count = await frame.locator(INSPECTABLE_SELECTOR).count();
        summaries.push(`${title}: ${count}`);
      } catch {
        // VS Code can replace a webview frame while its editor is changing.
      }
    }

    if (summaries.length > 0) {
      console.log(`[ReSTage Inspector] Webviews visible to Playwright: ${summaries.join(', ')}`);
    }
  }

  console.log('[ReSTage Inspector] Opening Inspector in the original Playwright session.');
  await restage.page.pause();
  console.log('[ReSTage Inspector] Inspector resumed/closed.');
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
  let inspectorServer: Server | undefined;
  try {
    const page = await workbenchPage(browser);
    const restage = new ReStage(page);
    const resources = new Resources();

    const inspectorControl = await startInspectorServer(restage);
    inspectorServer = inspectorControl.server;
    writeRuntimeState(cdpEndpoint, child.pid, inspectorControl.endpoint);
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

    await wizardTest.init();
    await actionsTest.init();
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

    await environmentTest.init();
    await rmlTest.init();

    log('All tests completed. Opening Playwright Inspector in the original Playwright session.');
    log('You can also run `npm run inspect` from another terminal at any time while this VS Code session is running.');

    // Keep Inspector on the same Playwright connection that created and already
    // sees the VS Code webviews. This allows the locator picker to traverse the
    // ReSTage API Schema frame instead of attaching a second CDP session.
    await inspect(restage, 'ReSTage API Schema');

    log('Inspector closed. VS Code will remain open until you close the automation window.');
    await waitForVsCodeToClose(cdpEndpoint);
  } finally {
    await closeServer(inspectorServer);
    clearRuntimeState();

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
