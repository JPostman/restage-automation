import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const RUNTIME_STATE = path.join(PROJECT_ROOT, '.restage-automation.json');
const TIMEOUT_MS = 30_000;

interface RuntimeState {
  ownerPid: number;
  vscodePid: number | null;
  cdpEndpoint: string;
  inspectorEndpoint: string;
  startedAt: string;
}

function log(message: string): void {
  console.log(`[ReSTage Inspector] ${message}`);
}

function readRuntimeState(): RuntimeState {
  if (!fs.existsSync(RUNTIME_STATE)) {
    throw new Error('No running ReSTage automation session was found. Run `npm start` first and leave it running.');
  }

  const state = JSON.parse(fs.readFileSync(RUNTIME_STATE, 'utf8')) as Partial<RuntimeState>;
  if (!state.inspectorEndpoint) {
    throw new Error('The running automation does not expose the same-session Inspector endpoint. Restart it with `npm start`.');
  }

  return state as RuntimeState;
}

async function main(): Promise<void> {
  const state = readRuntimeState();
  const frameTitle = process.argv.slice(2).join(' ').trim();

  const url = new URL('/inspect', state.inspectorEndpoint);
  if (frameTitle) url.searchParams.set('frame', frameTitle);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    log(frameTitle ? `Requesting Inspector in existing Playwright session for webview: ${frameTitle}` : 'Requesting Inspector in existing Playwright session.');

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Inspector request failed: HTTP ${response.status}${text ? ` - ${text}` : ''}`);
    }

    log('Inspector request accepted by the running automation. No second VS Code or Playwright session was created.');
  } finally {
    clearTimeout(timeout);
  }
}

await main().catch((error: unknown) => {
  console.error(`[ReSTage Inspector] FAILED: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});
