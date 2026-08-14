import { ReStage } from '../../../restage.js';
import { Resources } from '../../../resources.js';
import { Schema } from '../../tests/schema.js';

export class SchemaTest extends Schema {
  private readonly resources: Resources;

  constructor(restage: ReStage, resources: Resources) {
    super(restage);
    this.resources = resources;
  }

  async init(): Promise<void> {
    const apiSchema = await this.getSchema();
    const source = apiSchema.getByTestId('api-schema-source');
    await this.restage.waitVisible(source);
    await this.restage.fill(source, this.resources.resourceFile('openapi.yaml'), false);
    await this.parse();
  }
}
