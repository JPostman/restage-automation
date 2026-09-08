import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Page, ReStage } from '../../restage.js';

const MAVEN_RESULT_FILE = join(tmpdir(), 'restage-maven-last.json');

type MavenExecution = {
  exitCode: number;
  output: string;
  completedAt: number;
};

export class Actions {
  protected readonly page: Page;

  constructor(protected readonly restage: ReStage) {
    this.page = this.restage.page;
  }

  async open() {
    const actions = this.page.getByRole('button', { name: 'Actions Section' });
    await this.restage.waitVisible(actions);

    if ((await actions.getAttribute('aria-expanded')) === 'false') {
      await this.restage.click(actions);
    }
  }

  async toggleAIMesssageBot(): Promise<void> {
    const menu = this.page.getByRole('button', { name: 'ReSTage action: AI Message Bot' });
    await this.restage.click(menu);
  }

  async runTestWithAIEngine(): Promise<void> {
    const run = this.page.getByRole('button', { name: 'ReSTage action: Run Test with AI Engine' });
    const stop = this.page.getByRole('button', { name: 'ReSTage action: Stop Test Execution' });

    await this.restage.click(run);
    await this.restage.defaultTestMenu();

    // Clicking a VS Code TreeView action only waits for the UI click. Engine-AI
    // continues asynchronously after /api/tests/runs returns 202. Wait for the
    // Actions item to enter the running state and then return to the normal Run
    // state before allowing the next Playwright step/test to modify RML.
    await this.restage.waitVisible(stop, 20_000);
    await this.restage.waitFor(
      async () => ({
        running: await stop.isVisible().catch(() => false),
        ready: await run.isVisible().catch(() => false),
      }),
      (state) => !state.running && state.ready,
      120_000,
      100,
    );
  }

  async runMavenTest(): Promise<void> {
    const menu = this.page.getByRole('button', { name: 'ReSTage action: Run Maven Test' });
    await rm(MAVEN_RESULT_FILE, { force: true }).catch(() => undefined);
    await this.restage.click(menu);
    await this.restage.defaultTestMenu();
  }

  async openStudioTest(): Promise<void> {
    const menu = this.page.getByRole('button', { name: 'ReSTage action: Open Studio' });
    await this.restage.click(menu);
  }

  private async lastMavenExecution(): Promise<MavenExecution | undefined> {
    try {
      const execution = JSON.parse(await readFile(MAVEN_RESULT_FILE, 'utf8')) as MavenExecution;
      if (typeof execution.exitCode !== 'number' || typeof execution.output !== 'string' || typeof execution.completedAt !== 'number') {
        return undefined;
      }
      return execution;
    } catch {
      // The Maven run is still in progress, or Studio has not written the result yet.
      return undefined;
    }
  }

  async terminalText(): Promise<string> {
    return (await this.lastMavenExecution())?.output ?? '';
  }

  async mavenBuildSuccess(): Promise<void> {
    const execution = await this.restage.waitFor(
      () => this.lastMavenExecution(),
      (result) => result !== undefined,
      30_000,
    );

    if (!execution) {
      throw new Error('Maven execution finished without a result.');
    }
    if (execution.exitCode !== 0) {
      throw new Error(`Maven build failed with exit code ${execution.exitCode}.`);
    }
    if (!execution.output.includes('BUILD SUCCESS')) {
      throw new Error('Maven exited successfully, but BUILD SUCCESS was not found in the output.');
    }
  }
}
