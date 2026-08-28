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

    try {
      await trustPublisher.waitFor({
        state: 'visible',
        timeout: 1000,
      });

      await this.restage.click(trustPublisher);
    } catch {
      // Dialog did not appear — continue.
    }

    await this.restage.waitVisible(
      wizard.getByText('✓ Language Support for Java(TM) by Red Hat', {
        exact: true,
      }),
      60_000,
    );
  }

  async generateProject(): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.click(wizard.getByTestId('project-wizard-generate-project'));
    await this.restage.waitVisible(this.page.getByRole('button', { name: 'Project Explorer Section' }), 60_000);
    await this.restage.waitVisible(this.page.getByLabel(Resources.DEFAULT_FILE, { exact: true }).getByText(Resources.DEFAULT_FILE));
  }

  async openProject(): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.click(wizard.getByTestId('project-wizard-open-project'));
    await this.restage.waitVisible(this.page.getByRole('button', { name: 'Project Explorer Section' }));
    await this.restage.waitVisible(this.page.getByLabel(Resources.DEFAULT_FILE, { exact: true }).getByText(Resources.DEFAULT_FILE));
  }
}
