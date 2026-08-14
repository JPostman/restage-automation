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
  private mavenRunStartedAt = 0;

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

  async toogleApiSchema(): Promise<void> {
    const openApiSchema = this.page.getByRole('button', {
      name: 'ReSTage action: Open API Schema',
    });
    await this.restage.waitVisible(openApiSchema);
    await this.restage.click(openApiSchema);
  }

  async toggleAIMesssageBot(): Promise<void> {
    const menu = this.page.getByRole('button', { name: 'ReSTage action: AI Message Bot' });
    await this.restage.click(menu);
  }

  async runTestWithAIEngine(): Promise<void> {
    const menu = this.page.getByRole('button', { name: 'ReSTage action: Run Test with AI Engine' });
    await this.restage.click(menu);
  }

  async runMavenTest(): Promise<void> {
    const menu = this.page.getByRole('button', { name: 'ReSTage action: Run Maven Test' });

    // Mark this run before clicking and remove any result left by a previous run.
    // mavenBuildSuccess() will only accept a result completed after this timestamp.
    this.mavenRunStartedAt = Date.now();
    await rm(MAVEN_RESULT_FILE, { force: true }).catch(() => undefined);

    await this.restage.click(menu);
  }

  async openStudioTest(): Promise<void> {
    const menu = this.page.getByRole('button', { name: 'ReSTage action: Open Studio' });
    await this.restage.click(menu);
  }

  private async lastMavenExecution(): Promise<MavenExecution | undefined> {
    try {
      const execution = JSON.parse(await readFile(MAVEN_RESULT_FILE, 'utf8')) as MavenExecution;

      if (typeof execution.exitCode !== 'number' || typeof execution.output !== 'string' || typeof execution.completedAt !== 'number' || execution.completedAt < this.mavenRunStartedAt) {
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
