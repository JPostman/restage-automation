import { ReStage } from '../../../restage.js';
import { Wizard } from '../../tests/wizard.js';

export class WizardTest extends Wizard {
  constructor(restage: ReStage) {
    super(restage);
  }

  async init(): Promise<void> {
    await this.setProject(this.restage.rootDir);
    await this.setGroupId('io.restage');
    await this.setArtifactId('automation');
    await this.setClassName('RestageDemo');
    await this.setFramework('TestNG');
    await this.extensions();
    await this.generateProject();
  }
}
