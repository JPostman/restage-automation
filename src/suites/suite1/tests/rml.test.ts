import { ReStage } from '../../../restage.js';
import { Rml } from '../../base/rml.js';

export class RmlTest extends Rml {
  constructor(restage: ReStage) {
    super(restage);
  }

  async init(): Promise<void> {
    await this.openRmlTab();
    await this.dragAndDropFolder('auth');
    await this.collapseFolders();
  }

  async addLoginUser(): Promise<void> {
    await this.addNode('auth', 'POST', 'Login user');
    await this.nodeAction('login', 'Cache');
    await this.apply();
    await this.nodeAction('login', 'Run Test');
    await this.runTestDialog();
    await this.nodeAction('login', 'Actions');
    await this.loginDepedency();
  }

  async addAuthUser(): Promise<void> {
    await this.addNode('auth', 'GET', 'Get Auth User');
    await this.nodeAction('me', 'Run Test');
    await this.runTestDialog();
    await this.userDepedency('me', 'setAuthToken');
    await this.nodeAction('me', 'Run Test');
    await this.runTestDialog();
  }

  async addRefreshToken(): Promise<void> {
    await this.addNode('auth', 'POST', 'Refresh token');
    await this.nodeAction('refresh', 'Run Test');
    await this.runTestDialog();
    await this.userDepedency('refresh', 'setAuthToken');
    await this.nodeAction('refresh', 'Actions');
    await this.refreshAddBody();
    await this.nodeAction('refresh', 'Run Test');
    await this.runTestDialog();
  }

  async loginDepedency(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.getByLabel('Type', { exact: true }), 'auth');
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select a path from the' }));
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.apply();
    await this.restage.click(schema.getByRole('button', { name: 'Add' }));
    await this.restage.click(schema.getByRole('button', { name: 'Done' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Request method name' }), 'setAuthToken');
    await this.apply();
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

  async refreshAddBody(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.getByLabel('Type', { exact: true }), 'body');
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken.*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select a path from the' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken.*/ }));
    await this.apply();
    await this.restage.click(schema.getByRole('button', { name: 'Add' }));
    await this.restage.click(schema.getByRole('button', { name: 'Done' }));
    await this.restage.check(schema.getByRole('radio', { name: 'Apply directly to this test' }));
    await this.apply();
  }
}
