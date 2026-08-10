import { ReStage } from '../../../restage.js';

export class EnvironmentTest {
  constructor(private readonly restage: ReStage) {}

  private async getSchema() {
    return this.restage.waitFrame('ReSTage API Schema');
  }

  async init(): Promise<void> {
    const key = 'hello';
    await this.add(key, 'world');
    await this.remove(key);
  }

  async add(key: string, value: string): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByTestId('api-schema-environment-tab'));
    await this.restage.click(schema.locator('#envAdd'));

    // #envAdd inserts the new blank environment row first.
    const row = schema.locator('.env-row').first();
    await this.restage.waitVisible(row);
    await this.restage.fill(row.locator('.env-key-input'), key, true);
    await this.restage.fill(row.locator('.env-value-input'), value, true);
    await this.restage.click(schema.locator('#envSave'));
  }

  async remove(key: string): Promise<void> {
    const schema = await this.getSchema();
    const row = schema.locator('.env-row').filter({
      has: schema.locator(`.env-key-input[value="${key}"]`),
    });
    await this.restage.waitVisible(row);
    await this.restage.click(row.locator('.env-delete-row'));
    await this.restage.click(schema.locator('#envSave'));
  }
}
