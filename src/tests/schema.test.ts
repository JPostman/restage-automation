import { Frame, Locator, ReStage } from '../restage.js';
import { Resources } from '../resources.js';

export class SchemaTest {
  constructor(
    private readonly restage: ReStage,
    private readonly resources: Resources,
  ) {}

  private async getSchema(): Promise<Frame> {
    return this.restage.frameByTitle('ReSTage API Schema');
  }

  private async getSection(row: number, col: number): Promise<Locator> {
    const apiSchema = await this.getSchema();
    const section = apiSchema.locator(`[data-preview-state-key="root/folder:${row}/operation:${col}"]`);
    this.restage.waitVisible(section);
    await section.scrollIntoViewIfNeeded();
    return section;
  }

  async init(): Promise<void> {
    const apiSchema = await this.getSchema();
    const source = apiSchema.getByTestId('api-schema-source');
    await this.restage.waitVisible(source);
    await this.restage.fill(source, this.resources.text('openapi.yaml'), false);

    const parse = apiSchema.getByTestId('api-schema-parse');
    await this.restage.waitVisible(parse);
    await this.restage.click(parse);
  }

  async openOperation(row: number, col: number): Promise<void> {
    const section = await this.getSection(row, col);
    if ((await section.getAttribute('open')) === null) {
      await this.restage.click(section.locator('summary.operation-summary'));
    }
    await this.restage.waitVisible(section.locator('.operation-details'));
  }

  async changeVariable(row: number, col: number, currentText: string): Promise<void> {
    const apiSchema = await this.getSchema();
    const section = await this.getSection(row, col);
    const bodyValue = section.locator('.body-edit-hint:visible').filter({ hasText: currentText });
    await this.restage.click(bodyValue, 'right');

    const contextMenu = apiSchema.locator('#apiContextMenu:visible');
    const addEnvironment = contextMenu.getByRole('button', { name: 'Add Environment', exact: true });
    await this.restage.waitVisible(addEnvironment);
    await this.restage.click(addEnvironment);

    const save = apiSchema.locator('#envEditSave:visible');
    await this.restage.click(save);
  }

  async changeBody(row: number, col: number, source: string, target: string): Promise<void> {
    const schema = await this.getSchema();
    const section = await this.getSection(row, col);
    const bodyValue = section.locator('.api-example-pre:visible').filter({ hasText: source });
    await this.restage.click(bodyValue, 'right');

    const contextMenu = schema.locator('#apiContextMenu:visible');
    const editBody = contextMenu.getByRole('button', { name: 'Edit Body', exact: true });
    await this.restage.waitVisible(editBody);
    await this.restage.click(editBody);

    const input = schema.locator('#textEditValue:visible');
    await this.restage.waitVisible(input);
    await this.restage.fill(input, target);

    const save = schema.locator('#textEditSave:visible');
    await this.restage.click(save);
  }

  async changeLabel(row: number, col: number, label: string): Promise<void> {
    const apiSchema = await this.getSchema();
    const section = await this.getSection(row, col);

    const currentLabel = section.locator('.request-name-edit.request-name-summary:visible');
    await this.restage.waitVisible(currentLabel);
    await this.restage.click(currentLabel);

    // The edit dialog is global to the API Schema webview.
    const input = apiSchema.locator('#textEditInput:visible');
    await this.restage.waitVisible(input);
    await this.restage.fill(input, label);

    const save = apiSchema.locator('#textEditSave:visible');
    await this.restage.waitVisible(save);
    await this.restage.click(save);

    // Saving re-renders the preview. Verify the unique summary label changed.
    const updatedLabel = section.locator('.request-name-edit.request-name-summary:visible').filter({ hasText: label });
    await this.restage.waitVisible(updatedLabel);
  }
}
