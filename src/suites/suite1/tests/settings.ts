import { ReStage } from '../../../restage.js';
import { Settings, SettingsTab } from '../../base/settings.js';

export class SettingsTest extends Settings {
  constructor(restage: ReStage) {
    super(restage);
  }

  async init(): Promise<void> {
    const deleteButton = this.restage.page.getByRole('button', { name: 'Clear Notification (Del)' });
    if (await this.restage.exists(deleteButton)) {
      await this.restage.click(deleteButton);
    }
    await this.open(SettingsTab.RML).wrapLine(true).apply();
  }
}

export { SettingsTab };
