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
    if (!(await fileTab.isVisible())) {
      const workbench = this.page.locator('.monaco-workbench');
      const projectExplorer = this.page.getByRole('button', { name: 'Project Explorer Section' });
      const input = this.page.locator('.quick-input-widget:visible input');

      // Open Project is initiated from a webview. Keyboard focus can remain in
      // that iframe after VS Code changes workspace, so Ctrl+P is swallowed by
      // the webview. Explicitly return focus to the workbench and retry while
      // the reload settles.
      for (let attempt = 0; attempt < 3 && !(await input.isVisible()); attempt += 1) {
        await projectExplorer.click({ timeout: 10_000 });
        await workbench.evaluate((element) => (element as HTMLElement).focus());
        await this.page.keyboard.press('Escape');
        await this.page.keyboard.press('Control+P');
        await input.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
      }

      await input.waitFor({ state: 'visible', timeout: 5_000 });
      await input.fill(filePath);
      await input.press('Enter');
    }
    await this.restage.waitVisible(fileTab, 60_000);
  }
}
