import { ReStage } from '../../../restage.js';
import { Settings, SettingsTab } from '../../tests/settings.js';

export class SettingsTest extends Settings {
  constructor(restage: ReStage) {
    super(restage);
  }

  async init(): Promise<void> {
    await this.restage.click(this.restage.page.getByRole('button', { name: 'Clear Notification (Del)' }));
    await this.open(SettingsTab.RML).wrapLine(true).apply();
  }
}

export { SettingsTab };
