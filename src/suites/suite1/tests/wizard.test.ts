import { ReStage } from '../../../restage.js';

export class WizardTest {
  constructor(private readonly restage: ReStage) {}

  async init(): Promise<void> {
    const page = this.restage.page;
    const wizard = await this.restage.waitFrame('Project Wizard');

    await this.restage.fill(wizard.getByRole('textbox', { name: 'Project folder' }), this.restage.rootDir);
    await this.restage.fill(wizard.getByRole('textbox', { name: 'groupId' }), 'io.restage');
    await this.restage.fill(wizard.getByRole('textbox', { name: 'artifactId' }), 'automation');
    await this.restage.fill(wizard.getByRole('textbox', { name: 'Class name' }), 'RestageDemo');
    await this.restage.select(wizard.getByLabel('Test framework'), 'TestNG');

    await this.restage.click(wizard.getByTestId('project-wizard-install-java-extensions'));

    const trustPublisher = page.getByRole('button', {
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

    await this.restage.click(wizard.getByTestId('project-wizard-generate-project'));
    await this.restage.waitVisible(page.getByRole('button', { name: 'Project Explorer Section' }));
    await this.restage.waitVisible(page.getByLabel('RestageDemo.java', { exact: true }).getByText('RestageDemo.java'));
  }
}
