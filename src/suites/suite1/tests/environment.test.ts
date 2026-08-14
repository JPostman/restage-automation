import { ReStage } from '../../../restage.js';
import { Environment } from '../../base/environment.js';

export class EnvironmentTest extends Environment {
  constructor(restage: ReStage) {
    super(restage);
  }

  async init(): Promise<void> {
    const key = 'hello';
    await this.add(key, 'world');
    await this.remove(key);
  }
}
