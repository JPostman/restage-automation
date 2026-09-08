import fs from 'node:fs';
import { Resources } from '../../resources.js';
import { FrameLocator, Page, ReStage } from '../../restage.js';

export class Wizard {
  protected readonly page: Page;

  constructor(protected readonly restage: ReStage) {
    this.page = this.restage.page;
  }

  async getWizard(selector = '#projectFolder'): Promise<FrameLocator> {
    return this.restage.waitFrameLocator('Project Wizard', selector);
  }

  async setProject(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.fill(wizard.locator('#projectFolder'), value); // "Project folder"
  }

  async setGroupId(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.fill(wizard.locator('#groupId'), value); // "groupId"
  }

  async setArtifactId(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.fill(wizard.locator('#artifactId'), value); // "artifactId"
  }

  async setClassName(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.fill(wizard.locator('#className'), value); // "Class name"
  }

  async setFramework(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.select(wizard.locator('#framework'), value); // "Test framework"
  }

  async extensions(): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.click(wizard.getByTestId('project-wizard-install-java-extensions'));

    const trustPublisher = this.page.getByRole('button', {
      name: 'Trust Publisher & Install',
    });

    void (async () => {
      const deadline = Date.now() + 3_000;

      while (Date.now() < deadline) {
        try {
          if (await trustPublisher.isVisible()) {
            await this.restage.click(trustPublisher);
            return;
          }
        } catch {
          // Dialog may be opening or changing.
        }

        await this.page.waitForTimeout(1_000);
      }
    })();
  }

  async generateProject(): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.click(wizard.getByTestId('project-wizard-generate-project'));
    await this.restage.waitVisible(this.page.getByRole('button', { name: 'Project Explorer Section' }), 60_000);
    await this.openDefaultFile();
  }

  async openProject(): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.click(wizard.getByTestId('project-wizard-open-project'));
    await this.restage.waitVisible(this.page.getByRole('button', { name: 'Project Explorer Section' }), 60_000);
    await this.openDefaultFile();
  }

  private async openDefaultFile(): Promise<void> {
    const resources = new Resources(this.restage);
    const filePath = resources.main();
    await this.restage.waitFor(
      async () => fs.existsSync(filePath),
      (exists) => exists,
      60_000,
    );

    const fileTab = this.page.getByRole('tab', { name: Resources.DEFAULT_FILE });
    if (await fileTab.isVisible()) return;

    const workbench = this.page.locator('.monaco-workbench');
    const input = this.page.locator('.quick-input-widget:visible input');
    const deadline = Date.now() + 60_000;
    let lastError: unknown;

    // Project Explorer can become visible before the new VS Code workbench is
    // ready to accept Ctrl+P after a workspace reload. Do not treat Explorer
    // visibility as editor readiness. Keep retrying Quick Open until the Java
    // tab is actually visible.
    while (Date.now() < deadline && !(await fileTab.isVisible().catch(() => false))) {
      try {
        await workbench.waitFor({ state: 'visible', timeout: 5_000 });
        await workbench.evaluate((element) => (element as HTMLElement).focus());
        await this.page.keyboard.press('Escape');
        await this.page.keyboard.press('Control+P');

        const remaining = Math.max(1, deadline - Date.now());
        await input.waitFor({ state: 'visible', timeout: Math.min(5_000, remaining) });
        await input.fill(filePath);
        await input.press('Enter');

        await fileTab.waitFor({ state: 'visible', timeout: Math.min(5_000, Math.max(1, deadline - Date.now())) });
      } catch (error) {
        lastError = error;
        await this.page.keyboard.press('Escape').catch(() => undefined);
        await this.page.waitForTimeout(250);
      }
    }

    if (!(await fileTab.isVisible().catch(() => false))) {
      const details = lastError instanceof Error ? ` Last error: ${lastError.message}` : '';
      throw new Error(`VS Code workspace opened, but ${Resources.DEFAULT_FILE} did not become ready within 60000ms.${details}`);
    }

    await this.restage.waitVisible(fileTab, 60_000);
  }
}
