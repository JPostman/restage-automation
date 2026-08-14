import { ReStage } from '../../../restage.js';
import { Resources } from '../../../resources.js';
import { Schema } from '../../base/schema.js';

export class SchemaTest extends Schema {
  private readonly resources: Resources;

  constructor(restage: ReStage) {
    super(restage);
    this.resources = new Resources(restage);
  }

  getSchemaFile(): string {
    return this.resources.load(this.resources.resources('openapi.yaml'));
  }

  async init(): Promise<void> {
    const apiSchema = await this.getSchema();
    const source = apiSchema.getByTestId('api-schema-source');
    await this.restage.waitVisible(source);
    await this.restage.fill(source, this.getSchemaFile(), false);
    await this.parse();
  }
}
