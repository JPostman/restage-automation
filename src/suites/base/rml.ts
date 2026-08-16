import { FrameLocator, ReStage } from '../../restage.js';

export class Rml {
  constructor(protected readonly restage: ReStage) {}

  protected async getSchema(): Promise<FrameLocator> {
    await this.restage.toogleApiSchema();
    return this.restage.waitFrameLocator('ReSTage API Schema');
  }

  async collapseFolders(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'Collapse folders' }));
  }

  async expandFolders(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'Expand folders' }));
  }

  async openRmlTab(): Promise<void> {
    await this.restage.waitFor(
      async () => {
        const schema = await this.restage.findFrame('ReSTage API Schema');
        if (schema) {
          const rmlTab = schema.getByTestId('api-schema-rml-tab');
          if (await this.restage.exists(rmlTab)) {
            await this.restage.click(rmlTab);
          }
          if (await this.restage.visible(schema.getByText('REST Modeling Language'))) {
            return true;
          }
        }
        return false;
      },
      (exists) => exists,
    );
    await this.restage.sleep();
  }

  async dragAndDropFolder(name: string): Promise<void> {
    const schema = await this.getSchema();
    const testFlow = schema.getByTestId('rml-test-flow');
    const folder = schema.getByTestId(`rml-folder-${name}-drag`).first();
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
    const node = schema.locator(`[data-source-method="${method}"]:visible`);
    if ((await node.count()) > 1) {
      await this.restage.exists(node);
      await this.restage.inspect();
    }
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

  async apply(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'Apply' }));
  }
}
