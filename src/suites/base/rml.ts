import { Resources } from '../../resources.js';
import { FrameLocator, ReStage } from '../../restage.js';
import { RmlAsserts } from './rml_asserts.js';

export class Rml {
  protected readonly asserts: RmlAsserts;
  protected readonly resources: Resources;

  constructor(protected readonly restage: ReStage) {
    this.asserts = new RmlAsserts(restage);
    this.resources = new Resources(restage);
  }

  protected async getSchema(): Promise<FrameLocator> {
    await this.restage.toogleApiSchema();
    return this.restage.waitFrameLocator('ReSTage API Schema');
  }

  async collapseFolders(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.locator('#rmlCollapseFolders')); // "Collapse folders"
  }

  async expandFolders(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.locator('#rmlCollapseFolders')); // "Expand folders" (same toggle)
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
    const menu = node.locator('[id^="rmlNode-"][id$="-menu"]'); // "Node actions"
    await this.restage.click(menu);

    const actionIdSuffix: Record<string, string> = {
      Remove: 'remove',
      'Run Test': 'run-test',
      Cache: 'cache',
      Actions: 'request',
      Assertions: 'asserts',
      Properties: 'properties',
    };
    const suffix = actionIdSuffix[action];
    if (!suffix) throw new Error(`Unsupported node action: ${action}`);
    const item = node.locator(`[id^="rmlNodeAction-"][id$="-${suffix}"]`); // Current label is `action`.
    await this.restage.waitVisible(item);
    await this.restage.click(item);
  }

  /** Returns the first result's response body log, not the displayed headers. */
  async runTestDialog(): Promise<string> {
    const schema = await this.getSchema();
    await this.restage.defaultTestMenu();
    const dialog = schema.locator('#rmlRunResultDialog'); // "Test Result"
    await dialog.waitFor({ state: 'visible', timeout: 120_000 });
    const result = dialog.locator('.rml-run-test-item').first();
    await result.waitFor({ state: 'visible', timeout: 10_000 });
    if ((await result.getAttribute('open')) === null) {
      await this.restage.click(result.locator(':scope > summary'));
    }
    const requestSection = result.locator('.rml-run-request-evidence').locator('..');
    const responseSection = result.locator('.rml-run-response-evidence').locator('..');
    if ((await requestSection.getAttribute('open')) === null) {
      await this.restage.click(requestSection.locator(':scope > summary > .rml-run-chevron'));
    }
    const unresolved = result.locator('.rml-run-request-unresolved'); // "Show unresolved request" / "Unresolved"
    if (await unresolved.isEnabled()) {
      await this.restage.check(unresolved);
    }
    if ((await responseSection.getAttribute('open')) === null) {
      await this.restage.click(responseSection.locator(':scope > summary > .rml-run-chevron'));
    }
    const responseUnresolved = result.locator('.rml-run-response-unresolved'); // "Show unresolved response" / "Unresolved"
    if (await responseUnresolved.isEnabled()) {
      await this.restage.check(responseUnresolved);
    }
    // Read stored evidence: switching Headers on replaces the visible <pre> content.
    const responseLog = await result.locator('.rml-run-response-evidence').getAttribute('data-body');
    if (responseLog === null) throw new Error('The test result has no response log attribute.');
    await this.restage.check(result.locator('.rml-run-response-headers')); // "Show response headers" / "Headers"
    await this.restage.check(result.locator('.rml-run-request-headers')); // "Show request headers" / "Headers"
    await this.restage.click(requestSection.locator(':scope > summary > .rml-run-chevron'));
    await this.restage.click(result.locator(':scope > summary > .rml-run-chevron'));
    await this.restage.click(schema.locator('#rmlRunResultMinimize')); // "Minimize dialog"
    await this.restage.click(schema.locator('#rmlRunResultCloseIcon')); // "Close test result"
    return responseLog;
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

  async add(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'Add' })); // "Add"
  }

  async update(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByRole('button', { name: 'Update' })); // "Update"
  }

  async apply(): Promise<void> {
    const schema = await this.getSchema();
    await this.resources.mainReset();
    await this.restage.click(schema.getByRole('button', { name: 'Apply' })); // "Apply"
    await this.resources.mainUpdated();
  }

  async done(): Promise<void> {
    const schema = await this.getSchema();
    await this.resources.mainReset();
    await this.restage.click(schema.getByRole('button', { name: 'Done' })); // "Done"
    await this.resources.mainUpdated();
  }
}
