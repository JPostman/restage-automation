import { Frame, ReStage } from '../restage.js';

export class RmlTest {
  constructor(private readonly restage: ReStage) {}

  private async getSchema(): Promise<Frame> {
    return this.restage.frameByTitle('ReSTage API Schema');
  }

  async init(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByTestId('api-schema-rml-tab'));
    await this.dragAndDropFolder('auth');
    await this.collapseFolders();
    await this.addNode('auth', 'POST', 'Login user');
    await this.nodeAction('login', 'Cache');
    await this.nodeAction('login', 'Run Test');
  }

  async collapseFolders(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'Collapse folders' }));
  }

  async expandFolders(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'Expand folders' }));
  }

  async dragAndDropFolder(name: string): Promise<void> {
    const schema = await this.getSchema();
    const testFlow = schema.getByTestId('rml-test-flow');
    const folder = schema.getByTestId(`rml-folder-${name}-drag`);

    await this.restage.waitVisible(folder);
    await this.restage.waitVisible(testFlow);
    await this.restage.drag(folder, testFlow);
    await this.restage.waitVisible(schema.getByTestId(`rml-runner-${name}`));
  }

  async addNode(folder: string, method: string, request: string): Promise<void> {
    const schema = await this.getSchema();
    const runnerNode = schema.getByTestId(`rml-runner-${folder}`);
    const runnerRequest = runnerNode.locator('.rml-runner-request').filter({ hasText: method }).filter({ hasText: request });
    const pin = runnerRequest.locator('.rml-pin-button[title="Pin out: extract request as Response"]');
    await this.restage.click(pin);
  }

  async nodeAction(method: string, action: string): Promise<void> {
    const schema = await this.getSchema();
    const node = schema.locator(`[data-node-id="response:${method}"]`);
    await this.restage.waitVisible(node);
    const menu = node.getByRole('button', {
      name: 'Node actions',
    });
    await this.restage.click(menu);

    const item = node.getByRole('menuitem', {
      name: action,
      exact: true,
    });
    await this.restage.waitVisible(item);
    await this.restage.click(item);
  }
}
