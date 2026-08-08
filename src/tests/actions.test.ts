import { ReStage } from '../restage.js';
import { Resources } from '../resources.js';

export class ActionsTest {
  constructor(private readonly restage: ReStage) {}

  async init(): Promise<void> {
    const page = this.restage.page;

    const actions = page.getByRole('button', { name: 'Actions Section' });
    await this.restage.waitVisible(actions);

    if ((await actions.getAttribute('aria-expanded')) === 'false') {
      await this.restage.click(actions);
    }

    await this.restage.waitVisible(page.getByRole('tab', { name: 'RestageDemo.java' }));

    const openApiSchema = page.getByRole('button', {
      name: 'ReSTage action: Open API Schema',
    });
    await this.restage.waitVisible(openApiSchema);
    await this.restage.click(openApiSchema);
  }
}
