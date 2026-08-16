import { ReStage } from '../../../restage.js';
import { Rml } from '../../base/rml.js';

export class RmlTest extends Rml {
  constructor(restage: ReStage) {
    super(restage);
  }

  async init(): Promise<void> {
    await this.openRmlTab();
    await this.wrapLine();
    await this.dragAndDropFolder('auth');
    await this.collapseFolders();
  }

  async wrapLine(): Promise<void> {
    const schema = await this.getSchema();
    this.restage.click(schema.getByRole('button', { name: 'RML options' }));
    this.restage.click(this.restage.page.getByRole('menuitemcheckbox', { name: 'Wrap Line' }));
  }

  async addLoginUser(): Promise<void> {
    await this.addNode('auth', 'POST', 'Login user');
    await this.cacheAccessToken();
    await this.nodeAction('loginUser', 'Run Test');
    await this.runTestDialog();
    await this.nodeAction('loginUser', 'Actions');
    await this.loginDepedency();
  }

  async addAuthUser(): Promise<void> {
    await this.addNode('auth', 'GET', 'Get Auth User');
    await this.nodeAction('getAuthUser', 'Run Test');
    await this.runTestDialog();
    await this.nodeAction('getAuthUser', 'Actions');
    await this.updateActions('authUserCall');
    await this.nodeAction('authUserCall', 'Run Test');
    await this.runTestDialog();
  }

  async addRefreshToken(): Promise<void> {
    await this.addNode('auth', 'POST', 'Refresh token');
    await this.nodeAction('refresh', 'Run Test');
    await this.runTestDialog();
    //await this.userDepedency('refresh', 'setAuthToken');
    await this.nodeAction('refresh', 'Actions');
    await this.refreshAddBody();
    await this.nodeAction('refresh', 'Run Test');
    await this.runTestDialog();
  }

  async cacheAccessToken(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeAction('loginUser', 'Cache');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Cache Name' }), 'token');
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache Object from' }));
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.apply();
  }

  async loginDepedency(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.getByLabel('Type', { exact: true }), 'body');
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: 'username: "{{username}}"' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Value Insert a' }));
    await this.restage.click(schema.getByRole('button', { name: 'username: "{{username}}"' }));
    await this.restage.click(schema.getByRole('button', { name: 'Add' }));
    await this.restage.click(schema.getByRole('button', { name: 'Done' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Request method name' }), 'setUserName');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Ref ID' }), 'username');
    await this.apply();
  }

  async updateActions(method: string): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.getByLabel('Type', { exact: true }), 'auth');
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Apply' }));
    await this.restage.click(schema.getByRole('button', { name: 'Add' }));
    await this.restage.click(schema.getByRole('button', { name: 'Done' }));
    await this.restage.check(schema.getByRole('radio', { name: 'Apply directly to this test' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Call method name' }), method);
    await this.apply();
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
