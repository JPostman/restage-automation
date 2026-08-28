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
    await this.addClassVaraible('CACHE_TOKEN', 'token');
    await this.addClassVaraible('SET_AUTH', '#setAuth');
    await this.addClassVaraible('GET_AUTH', '#getAuth');
    await this.restage.sleep();
  }

  async wrapLine(): Promise<void> {
    const schema = await this.getSchema();
    const menu = schema.locator('#rmlToolbarMenuToggle');
    const wrapLine = schema.locator('#rmlWrapAnnotations');
    await this.restage.click(menu); // Current label: "RML options"
    if (await wrapLine.isChecked()) {
      await this.restage.click(menu); // Current label: "RML options"
    } else {
      await this.restage.click(wrapLine); // Current label: "Wrap Line"
    }
    await this.restage.sleep();
  }

  async addClassVaraible(name: string, value: string): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'RML options' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Class Variables' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Variable Name' }), name);
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), value);
    await this.add();
    await this.done();
  }

  async addLoginUser(): Promise<void> {
    await this.addNode('auth', 'POST', 'Login user');
    await this.cacheAccessToken('loginUserAuthToken');
    await this.nodeAction('loginUserAuthToken', 'Run Test');
    await this.asserts.validateCurrentUser(this.runTestDialog());
  }

  async addAuthUser(): Promise<void> {
    await this.addNode('auth', 'GET', 'Get Auth User');
    await this.nodeAction('getAuthUser', 'Run Test');
    await this.asserts.validateAccessTokenError(this.runTestDialog());
  }

  async cacheAccessToken(method: string): Promise<void> {
    const schema = await this.getSchema();
    const notAvailable = schema.getByText('Response not available. Click');
    await this.nodeAction('loginUser', 'Cache');
    await this.restage.click(schema.getByRole('button', { name: 'Select ID class variable' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'GET_AUTH #getAuth' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Method Name' }), method);
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache Name class' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'CACHE_TOKEN token' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache Object from' }));
    if (await this.restage.exists(notAvailable)) {
      await this.restage.click(schema.getByRole('button', { name: 'Run Test' }));
      await this.restage.defaultTestMenu();
      await this.restage.waitFor(
        () => notAvailable.count(),
        (count) => count == 0,
      );
    }
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.apply();
  }

  async createRequestToken(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeAction('getAuthUser', 'Actions');
    await this.restage.click(schema.getByRole('button', { name: 'Create Request' }));
    await this.restage.click(schema.getByRole('radio', { name: 'Request runs before Response' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Request method name' }), 'authRequest');
    await this.restage.click(schema.getByRole('button', { name: 'Select Request ID class' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'SET_AUTH #setAuth' }));
    await this.apply();
    await this.restage.sleep();
  }

  async addAuthDependency(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.locator('#rmlRequestType'), 'auth'); // "Edit Actions" → "Auth"
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.apply();
    await this.add();
    await this.done();
  }

  async addUserDependencies(): Promise<void> {
    await this.nodeAction('authRequest', 'Actions');
    await this.addAuthDependency();
    await this.nodeAction('getAuthUser', 'Run Test');
    await this.asserts.validateCurrentUser(this.runTestDialog());
  }

  async addRefreshToken(): Promise<void> {
    await this.addNode('auth', 'POST', 'Refresh token');
    await this.nodeAction('refreshToken', 'Run Test');
    await this.asserts.validateAccessRefreshTokenError(this.runTestDialog());
  }

  async addRefreshDependencies(): Promise<void> {
    await this.nodeAction('refreshToken', 'Actions');
    await this.addAuthDependency();
    await this.nodeAction('refreshToken', 'Run Test');
    await this.asserts.validateRefreshTokenError(this.runTestDialog());
  }

  async addRefreshBody(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeAction('refreshToken', 'Actions');

    await this.restage.select(schema.locator('#rmlRequestType'), 'body'); // "Edit Actions" → "Body"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken: .*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Value Select a value' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken: .*/ }));
    await this.add();
    await this.done();

    await this.nodeAction('refreshToken', 'Run Test');
    await this.asserts.validateRefreshToken(this.runTestDialog());
  }

  async preview(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'RML options' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Preview' }));

    const preview = await this.restage.waitFrame('ReSTage RML Preview');
    await this.restage.click(preview.getByRole('button', { name: 'Zoom out' }));
    await this.restage.click(preview.getByRole('button', { name: 'Zoom in' }));
    await this.restage.click(preview.getByRole('button', { name: 'Remove node from Preview' }).nth(1));
    await this.restage.click(preview.getByRole('button', { name: 'Reset' }));
    await preview.page().close();
  }
}
