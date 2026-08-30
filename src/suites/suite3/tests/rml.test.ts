import { ReStage } from '../../../restage.js';
import { Rml } from '../../base/rml.js';

export class RmlTest extends Rml {
  private loginUser: string = 'loginUserAuthToken';

  constructor(restage: ReStage) {
    super(restage);
  }

  async init(): Promise<void> {
    await this.openRmlTab();
    await this.wrapLine();
    await this.dragAndDropFolder('auth');
    await this.collapseFolders();
  }

  async addLoginUser(): Promise<void> {
    await this.addNode('auth', 'POST', 'Login user');
    await this.updateLoginUser(this.loginUser);
    await this.nodeAction(this.loginUser, 'Run Test');
    await this.asserts.validateCurrentUser(this.runTestDialog());
  }

  async updateLoginUser(method: string): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeAction('loginUser', 'Actions');
    await this.restage.click(schema.getByRole('button', { name: 'Select tags or class variables' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'New/Update' }));
    await this.restage.click(schema.getByRole('textbox', { name: 'Variable Name' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Variable Name' }), 'LOGIN');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), 'login');
    await this.add();
    await this.restage.click(schema.getByRole('button', { name: 'Select tags or class variables' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'New/Update' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Variable Name' }), 'TEST');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), 'test');
    await this.restage.click(schema.getByRole('button', { name: 'New' }));
    await this.restage.click(schema.getByLabel('Class Variables').getByRole('button', { name: 'Done' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select annotation ID class' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'New/Update' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Variable Name' }), 'GET_AUTH');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), '#auth');
    await this.add();
    await this.restage.click(schema.getByRole('textbox', { name: 'Method' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Method' }), method);
    await this.update();
    await this.done();
  }

  async varsLoginUser(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeAction(this.loginUser, 'Actions');
    await this.restage.select(schema.locator('#rmlRequestType'), 'variable'); // "Edit Actions" → "Variable"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Value Open the' }));
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.add();
    await this.restage.check(schema.getByRole('radio', { name: 'Secret' }));
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Variables', exact: true }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'LOCAL accessToken' }));
    await this.add();
    await this.restage.check(schema.getByRole('radio', { name: 'Secret' }));
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken: .*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Value Open the' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken: .*/ }));
    await this.add();
    await this.restage.check(schema.getByRole('radio', { name: 'Plain' }));
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: 'username: "{{username}}"' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Environments' }));
    await this.restage.click(schema.getByRole('menuitem', { name: '{{username}} emilys' }));
    await this.add();
    await this.done();
  }

  async addAuthUser(): Promise<void> {
    const schema = await this.getSchema();
    await this.addNode('auth', 'GET', 'Get Auth User');
    await this.nodeAction(this.loginUser, 'Actions');
    await this.restage.click(schema.getByRole('button', { name: 'Create Request' }));
    await this.restage.click(schema.locator('#rmlRequestSaveDependencyOption'));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Request method name' }), 'setAuthToken');
    await this.restage.click(schema.getByRole('button', { name: 'Select Request ID class' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Class Variable' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Variable Name' }), 'LOGIN_REQ');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), '#login');
    await this.add();
    await this.restage.click(schema.getByLabel('Class Variables').getByRole('button', { name: 'Done' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Request ID class' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'LOGIN_REQ #login' }));
    await this.apply();
  }

  async authUserRequestBody(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeAction('setAuthToken', 'Actions');
    await this.restage.select(schema.locator('#rmlRequestType'), 'body'); // "Edit Actions" → "Body"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: 'username: "{{username}}"' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'PLAIN username' }));
    await this.add();
    await this.done();
    await this.nodeAction(this.loginUser, 'Run Test');
    await this.asserts.validateCurrentUser(this.runTestDialog());
  }

  async createAuthRequest(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeAction('getAuthUser', 'Actions');
    await this.restage.click(schema.getByRole('button', { name: 'Create Request' }));
    await this.restage.click(schema.getByRole('radio', { name: 'Request runs before Response' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Request method name' }), 'authRequest');
    await this.restage.click(schema.getByRole('button', { name: 'Select Request ID class' }));

    await this.restage.click(schema.getByRole('menuitem', { name: 'Class Variable' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Variable Name' }), 'SET_AUTH');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), '#setAuth');
    await this.add();
    await this.restage.click(schema.getByLabel('Class Variables').getByRole('button', { name: 'Done' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Request ID class' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'SET_AUTH #setAuth' }));
    await this.apply();
  }

  async createAuthToken(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeAction('authRequest', 'Actions');
    await this.restage.select(schema.locator('#rmlRequestType'), 'auth'); // "Edit Actions" → "Auth"
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'SECRET accessToken' }));
    await this.add();
    await this.done();
    await this.nodeAction('getAuthUser', 'Run Test');
    await this.asserts.validateCurrentUser(this.runTestDialog());
  }

  async addRefreshToken(): Promise<void> {
    const schema = await this.getSchema();
    await this.addNode('auth', 'POST', 'Refresh token');
    await this.nodeAction('refreshToken', 'Actions');
    await this.restage.select(schema.locator('#rmlRequestType'), 'auth'); // "Edit Actions" → "Auth"
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'SECRET accessToken' }));
    await this.add();
    await this.restage.select(schema.locator('#rmlRequestType'), 'body'); // "Edit Actions" → "Body"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken: .*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'SECRET refreshToken' }));
    await this.add();
    await this.done();
    await this.nodeAction('refreshToken', 'Run Test');
    await this.asserts.validateRefreshToken(this.runTestDialog());
  }
}
