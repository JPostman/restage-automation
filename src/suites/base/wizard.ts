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
    await this.restage.fill(wizard.getByRole('textbox', { name: 'Project folder' }), value);
  }

  async setGroupId(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.fill(wizard.getByRole('textbox', { name: 'groupId' }), value);
  }

  async setArtifactId(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.fill(wizard.getByRole('textbox', { name: 'artifactId' }), value);
  }

  async setClassName(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.fill(wizard.getByRole('textbox', { name: 'Class name' }), value);
  }

  async setFramework(value: string): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.select(wizard.getByLabel('Test framework'), value);
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
    );
  }

  async generateProject(): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.click(wizard.getByTestId('project-wizard-generate-project'));
    await this.restage.waitVisible(this.page.getByRole('button', { name: 'Project Explorer Section' }));
    await this.restage.waitVisible(this.page.getByLabel('RestageDemo.java', { exact: true }).getByText('RestageDemo.java'));
  }

  async openProject(): Promise<void> {
    const wizard = await this.getWizard();
    await this.restage.click(wizard.getByTestId('project-wizard-open-project'));
    await this.restage.waitVisible(this.page.getByRole('button', { name: 'Project Explorer Section' }));
    await this.restage.waitVisible(this.page.getByLabel('RestageDemo.java', { exact: true }).getByText('RestageDemo.java'));
  }
}
