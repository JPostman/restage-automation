import { ReStage } from '../../../restage.js';
import { Actions } from '../../base/actions.js';
import { Rml } from '../../base/rml.js';

export class RmlTest extends Rml {
  private readonly actions: Actions;

  constructor(restage: ReStage) {
    super(restage);
    this.actions = new Actions(restage);
  }

  async init(): Promise<void> {
    await this.openRmlTab();
    await this.wrapLine();
    await this.dragAndDropFolder('auth');
    await this.collapseFolders();

    // POST - Login user
    await this.addNode('auth', 'POST', 'Login user');
    await this.nodeMenu('loginUser', 'Cache');
    await this.apply();

    // Get - Get Auth User
    await this.addNode('auth', 'GET', 'Get Auth User');
    await this.userDepedency('getAuthUser', 'loginUser');
    await this.nodeMenu('getAuthUser', 'Actions');
    await this.addAccessToken();
    await this.done();

    // Post - Refresh token
    await this.addNode('auth', 'POST', 'Refresh token');
    await this.userDepedency('refreshToken', 'loginUser');
    await this.nodeMenu('refreshToken', 'Actions');
    await this.addAccessToken();
    await this.addRefreshToken();
    await this.done();

    await this.actions.runTestWithAIEngine();
    await this.restage.defaultTestMenu();
  }

  async addAccessToken(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.locator('#rmlRequestType'), 'auth'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select a path from the' }));
    await this.restage.click(schema.getByRole('button', { name: 'Run Test' }));
    await this.restage.defaultTestMenu();
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.apply();
    await this.add();
  }

  async addRefreshToken(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.select(schema.locator('#rmlRequestType'), 'body'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Request Key Select a key from' }));
    await this.restage.click(schema.getByRole('button', { name: 'refreshToken: "refresh-emilys' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select a path from the' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken: .*/ }));
    await this.apply();
    await this.add();
  }

  async addChainFolder(): Promise<void> {
    await this.expandFolders();
    await this.dragAndDropFolder('chain');
    await this.addRequestParams();
    await this.userDepedency('testChainRunner', 'testAuthRunner');
    await this.collapseFolders();
  }

  async addRequestParams(): Promise<void> {
    const schema = await this.getSchema();
    await this.nodeMenu('testChainRunner', 'Pre-Request');
    await this.restage.select(schema.locator('#rmlRequestType'), 'auth'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select a path from the' }));
    await this.restage.click(schema.getByRole('button', { name: /accessToken: .*/ }));
    await this.apply();
    await this.add();
    await this.restage.select(schema.locator('#rmlRequestType'), 'params'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Environments' }));
    await this.restage.click(schema.getByRole('menuitem', { name: '{{chainId}}' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), 'chain-1001');
    await this.add();
    await this.restage.select(schema.locator('#rmlRequestType'), 'path'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Environments' }));
    await this.restage.click(schema.getByRole('menuitem', { name: '{{itemId}}' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), 'item-1002');
    await this.add();
    await this.restage.select(schema.locator('#rmlRequestType'), 'query'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Environments' }));
    await this.restage.click(schema.getByRole('menuitem', { name: '{{token}}' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), 'query-token');
    await this.add();
    await this.restage.select(schema.locator('#rmlRequestType'), 'headers'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.select(schema.getByLabel('Response source'), '1');
    await this.restage.click(schema.getByRole('button', { name: /refreshToken: .*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Cache, Response,' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Cache Value Read directly' }));
    await this.restage.click(schema.getByRole('button', { name: 'Select a path from the' }));
    await this.restage.click(schema.getByRole('button', { name: /refreshToken: .*/ }));
    await this.apply();
    await this.add();
    await this.restage.select(schema.locator('#rmlRequestType'), 'headers'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Environments' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Name / Key' }), 'X-Chain-Token');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), 'header-token');
    await this.restage.click(schema.getByRole('button', { name: 'Secure value' }));
    await this.add();
    await this.restage.select(schema.locator('#rmlRequestType'), 'body'); // "Type"
    await this.restage.click(schema.getByRole('button', { name: 'Open Variable Name or Name /' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Environments' }));
    await this.restage.click(schema.getByRole('menuitem', { name: '{{chainSource}}' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Value' }), 'Hello World');
    await this.add();
    await this.done();
  }
}
