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
    await this.runTestDialog();
    await this.nodeAction('login', 'Actions');
    await this.loginDepedency();

    await this.addNode('auth', 'GET', 'Get Auth User');
    await this.nodeAction('me', 'Run Test');
    await this.runTestDialog();
    await this.userDepedency('me', 'setAuthToken');
    await this.nodeAction('me', 'Run Test');
    await this.runTestDialog();

    await this.addNode('auth', 'POST', 'Refresh token');
    await this.nodeAction('refresh', 'Run Test');
    await this.runTestDialog();
    await this.userDepedency('refresh', 'setAuthToken');
    await this.nodeAction('refresh', 'Actions');
    await this.refreshAddBody('refresh');
    await this.nodeAction('refresh', 'Run Test');
    await this.runTestDialog();
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
    await this.restage.scroll(runnerNode);

    const runnerRequest = runnerNode.locator('.rml-runner-request').filter({ hasText: method }).filter({ hasText: request });
    const pin = runnerRequest.locator('.rml-pin-button[title="Pin out: extract request as Response"]');
    await this.restage.click(pin);
  }

  async nodeAction(method: string, action: string): Promise<void> {
    const schema = await this.getSchema();
    const node = schema.locator(`[data-source-method="${method}"]`);
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

  async runTestDialog(): Promise<void> {
    const schema = await this.getSchema();
    const methodChevron = schema.locator('details:nth-child(1) > summary > .rml-run-chevron');
    const requestChevron = schema.locator('details:nth-child(2) > summary > .rml-run-chevron');
    const responseChevron = schema.locator('details:nth-child(3) > summary > .rml-run-chevron');
    const unresolved = schema.getByRole('checkbox', { name: 'Unresolved' });

    if (await unresolved.isEnabled()) {
      await this.restage.check(unresolved);
    }
    await this.restage.click(responseChevron);

    await this.restage.check(schema.getByTitle('Show response headers').getByLabel('Headers'));
    await this.restage.check(schema.getByTitle('Show request headers').getByLabel('Headers'));
    await this.restage.click(requestChevron);
    await this.restage.click(methodChevron);
    await this.restage.click(schema.getByRole('button', { name: 'Minimize dialog' }));
    await this.restage.click(schema.getByRole('button', { name: 'Close test result' }));
  }

  async loginDepedency(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.getByLabel('Type', { exact: true }), 'auth');
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select a path from the' }));
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Apply' }));
    await this.restage.click(schema.getByRole('button', { name: 'Add' }));
    await this.restage.click(schema.getByRole('button', { name: 'Done' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Request method name' }), 'setAuthToken');
    await this.restage.click(schema.getByRole('button', { name: 'Apply' }));
  }

  async userDepedency(method1: string, method2: string): Promise<void> {
    const schema = await this.getSchema();
    const node1 = schema.locator(`[data-source-method="${method1}"]`);
    const node2 = schema.locator(`[data-source-method="${method2}"]`);
    await this.restage.click(node1);
    const handle = node1.getByRole('button', {
      name: 'Add dependency connection',
    });
    await this.restage.waitVisible(handle);
    await this.restage.waitVisible(node2);
    await this.restage.drag(handle, node2);
  }

  async refreshAddBody(method: string): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken.*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select a path from the' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken.*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Apply' }));
    await this.restage.click(schema.getByRole('button', { name: 'Add' }));
    await this.restage.click(schema.getByRole('button', { name: 'Done' }));
    await this.restage.check(schema.getByRole('radio', { name: 'Apply directly to this test' }));
    await this.restage.click(schema.getByRole('button', { name: 'Apply' }));
  }
}
