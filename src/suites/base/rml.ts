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
    // Every Playwright project can start in a fresh VS Code window. Suite 1
    // often leaves API Schema open, but later suites must not depend on that
    // state. Open the webview first, then select RML deterministically.
    await this.restage.toogleApiSchema();
    const schema = await this.restage.waitFrameLocator('ReSTage API Schema', '#apiSettingsOpen', 60_000);
    const rmlTab = schema.getByTestId('api-schema-rml-tab');
    await this.restage.waitVisible(rmlTab, 60_000);
    await this.restage.click(rmlTab);
    await this.restage.waitVisible(schema.getByText('REST Modeling Language'), 60_000);
    await this.restage.sleep();
  }

  async dragAndDropFolder(name: string): Promise<void> {
    const schema = await this.getSchema();
    const testFlow = schema.getByTestId('rml-test-flow');
    const expectedPath = String(name || '')
      .trim()
      .toLowerCase()
      .replace(/^\/+|\/+$/g, '');
    const escapedPath = expectedPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    // Keep the locator itself bound to the immutable folder path. Returning an
    // nth(index) locator is unsafe because Playwright locators are live and a
    // webview refresh can reorder the folder list before dragTo() resolves it.
    const folder = schema.locator(`summary[data-folder-path="${escapedPath}" i], summary[data-folder-path$="/${escapedPath}" i]`).filter({ visible: true }).first();
    await this.restage.waitVisible(folder);

    await this.restage.waitVisible(testFlow);
    const runner = schema.getByTestId(`rml-runner-${name}`);
    const builderMessage = schema.locator('#builderMessage');

    // Playwright's dragTo() can complete after pointer movement without
    // delivering the HTML5 DataTransfer payload expected by Studio. This is
    // especially visible after the folders pane is collapsed and expanded:
    // the source summary has been re-rendered, the log reports a drag, but the
    // drop handler never receives application/x-restage-rml. Dispatch the full
    // HTML5 sequence in the webview so Studio builds its payload in dragstart
    // and receives that same DataTransfer object in drop.
    await folder.evaluate((source) => {
      const target = document.querySelector('[data-testid="rml-test-flow"]');
      if (!(target instanceof HTMLElement)) {
        throw new Error('RML Test Flow drop zone was not found.');
      }
      const dataTransfer = new DataTransfer();
      const dispatch = (element: Element, type: string) => element.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }));
      dispatch(source, 'dragstart');
      dispatch(target, 'dragenter');
      dispatch(target, 'dragover');
      dispatch(target, 'drop');
      dispatch(source, 'dragend');
    });

    const outcome = await this.restage.waitFor(
      async () => {
        const runnerVisible = await runner.isVisible().catch(() => false);
        const messageVisible = await builderMessage.isVisible().catch(() => false);
        const messageClass = messageVisible ? String((await builderMessage.getAttribute('class')) || '') : '';
        const message = messageVisible ? String((await builderMessage.textContent()) || '').trim() : '';
        return { runnerVisible, errorVisible: messageClass.split(/\s+/).includes('error'), message };
      },
      (value) => value.runnerVisible || value.errorVisible,
      60_000,
    );
    if (!outcome.runnerVisible) {
      throw new Error(outcome.message || `Studio did not create Runner ${JSON.stringify(name)}.`);
    }
    const runnerPath = String((await runner.getAttribute('data-folder-path')) || '')
      .trim()
      .toLowerCase()
      .replace(/^\/+|\/+$/g, '');
    if (runnerPath && runnerPath !== expectedPath && !runnerPath.endsWith('/' + expectedPath)) {
      throw new Error(`Dragged ${JSON.stringify(name)}, but Studio created Runner ${JSON.stringify(runnerPath)}.`);
    }
  }

  async userDepedency(method1: string, method2: string): Promise<void> {
    const schema = await this.getSchema();
    const node1 = schema.locator(`[data-source-method="${method1}"]`);
    const node2 = schema.locator(`[data-source-method="${method2}"]`);
    await this.restage.click(node1);
    const handle = node1.locator('[id^="rmlNode-"][id$="-dependency"]'); // "Add dependency connection"
    await this.restage.waitVisible(handle);
    await this.restage.waitVisible(node2);
    await this.restage.drag(handle, node2);
  }

  async addNode(folder: string, method: string, request: string): Promise<void> {
    const schema = await this.getSchema();
    const runnerNode = schema.getByTestId(`rml-runner-${folder}`);
    await this.restage.scroll(runnerNode);

    const runnerRequest = runnerNode.locator('.rml-runner-request').filter({ hasText: method }).filter({ hasText: request });
    const pin = runnerRequest.locator('.rml-pin-button[title="Pin out: extract request as Response"]');
    await this.restage.click(pin);
  }

  async nodeMenu(method: string, action: string): Promise<void> {
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
      'Run Test': 'run-test',
      Actions: 'request',
      Assertions: 'asserts',
    };
    const suffix = actionIdSuffix[action] || action.toLowerCase();
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
