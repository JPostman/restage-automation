import { ReStage } from '../../../restage.js';
import { Rml } from '../../base/rml.js';

const RML_SET_TOKEN = 'setAuthToken';

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
    await this.nodeMenu('login', 'Cache');
    await this.apply();
    await this.nodeMenu('login', 'Run Test');
    await this.asserts.validateLoginUser(this.runTestDialog());
  }

  async addAuthUser(): Promise<void> {
    await this.addNode('auth', 'GET', 'Get Auth User');
    await this.nodeMenu('me', 'Run Test');
    await this.runTestDialog();
    await this.userDepedency('me', RML_SET_TOKEN);
    await this.nodeMenu('me', 'Run Test');
    await this.asserts.validateCurrentUser(this.runTestDialog());
  }

  async addRefreshToken(): Promise<void> {
    await this.addNode('auth', 'POST', 'Refresh token');
    await this.nodeMenu('refresh', 'Run Test');
    await this.runTestDialog();
    await this.userDepedency('refresh', RML_SET_TOKEN);
    await this.nodeMenu('refresh', 'Actions');
    await this.refreshAddBody();
    await this.nodeMenu('refresh', 'Run Test');
    await this.asserts.validateRefreshToken(this.runTestDialog());
  }

  async createRequestToken(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeMenu('login', 'Actions');
    await this.restage.click(schema.locator('#rmlRequestCreateDependency')); // "Create Request"
    await this.restage.check(schema.locator('#rmlRequestSaveDependent')); // "Request runs after Response"
    await this.restage.fill(schema.locator('#rmlRequestDependencyName'), RML_SET_TOKEN); // "Request method name"
    await this.restage.fill(schema.locator('#rmlRequestDependencyId'), 'token'); // "Ref ID"
    await this.apply();
  }

  async setRequestToken(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeMenu(RML_SET_TOKEN, 'Actions');
    await this.restage.select(schema.locator('#rmlRequestType'), 'auth'); // "Type"
    await this.restage.click(schema.locator('#rmlRequestEnvironment')); // "Select Cache, Response, Request, Variable, or Environment value"
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.locator('#rmlRequestCachePathPicker')); // "Select a path from the response body"
    await this.restage.click(schema.locator('#rmlAssertionResponseTree button').filter({ hasText: 'accessToken' })); // Current option starts with `accessToken: "access-emilys-`.
    await this.apply(); // "Apply"
    await this.add(); // "Add"
    await this.done(); // "Done"
  }

  async refreshAddBody(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.locator('#rmlRequestType'), 'body'); // "Type"
    await this.restage.click(schema.locator('#rmlRequestVariable')); // "Open Variable Name or Name / Key options"
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken.*/ }));
    await this.restage.click(schema.locator('#rmlRequestEnvironment')); // "Select Cache, Response, Request, Variable, or Environment value"
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.locator('#rmlRequestCachePathPicker')); // "Select a path from the response body"
    await this.restage.click(schema.getByRole('button', { name: /refreshToken.*/ }));
    await this.apply();
    await this.add(); // "Add"
    await this.done(); // "Done"
  }
}
