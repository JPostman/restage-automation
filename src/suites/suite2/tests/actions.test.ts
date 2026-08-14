import { ReStage } from '../../../restage.js';
import { Actions } from '../../tests/actions.js';

export class ActionsTest extends Actions {
  constructor(restage: ReStage) {
    super(restage);
  }

  async init(): Promise<void> {
    await this.open();
    await this.runMavenTest();
    await this.mavenBuildSuccess();
  }
}
