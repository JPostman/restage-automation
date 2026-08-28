import { FrameLocator, ReStage } from '../../restage.js';

export class Settings {
  protected queue: Promise<void> = Promise.resolve();
  protected dialog: FrameLocator | undefined = undefined;

  constructor(protected readonly restage: ReStage) {}

  open(tab: SettingsTab): Settings {
    this.queue = this.queue.then(async () => {
      this.dialog = await this.restage.waitFrameLocator('ReSTage API Schema');
      await this.restage.click(this.dialog.locator('#apiSettingsOpen')); // "Open ReStage API Schema"
      const tabIds: Record<SettingsTab, string> = {
        [SettingsTab.Schema]: '#apiSettingsSchemaTab',
        [SettingsTab.RML]: '#apiSettingsRmlTab',
        [SettingsTab.Engine]: '#apiSettingsEngineTab',
      };
      const selectedTab = this.dialog.locator(tabIds[tab]); // Settings section: current label is `tab`.
      await this.restage.click(selectedTab);
    });
    return this;
  }

  wrapLine(value: boolean): Settings {
    this.queue = this.queue.then(async () => {
      const checkbox = this.dialog!.locator('#apiSettingsWrapLine'); // "Wrap Line"
      await (value ? checkbox.check() : checkbox.uncheck());
    });
    return this;
  }

  apply(): Promise<void> {
    this.queue = this.queue.then(async () => {
      await this.restage.click(this.dialog!.locator('#apiSettingsSave')); // "Save"
    });
    return this.queue;
  }

  close(): Promise<void> {
    this.queue = this.queue.then(async () => {
      await this.restage.click(this.dialog!.locator('#apiSettingsClose')); // "Close settings"
    });
    return this.queue;
  }
}

export enum SettingsTab {
  Schema = 'Schema',
  RML = 'RML',
  Engine = 'Engine',
}
