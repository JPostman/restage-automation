import { FrameLocator, ReStage } from '../../restage.js';

export class Settings {
  protected queue: Promise<void> = Promise.resolve();
  protected dialog: FrameLocator | undefined = undefined;

  constructor(protected readonly restage: ReStage) {}

  open(tab: SettingsTab): Settings {
    this.queue = this.queue.then(async () => {
      this.dialog = await this.restage.waitFrameLocator('ReSTage API Schema');
      await this.restage.click(this.dialog.getByRole('button', { name: 'Open ReStage API Schema' }));
      const selectedTab = this.dialog.getByLabel('Settings sections').getByRole('button', { name: tab });
      await this.restage.click(selectedTab);
    });
    return this;
  }

  wrapLine(value: boolean): Settings {
    this.queue = this.queue.then(async () => {
      const checkbox = this.dialog!.getByRole('checkbox', { name: 'Wrap Line' });
      await (value ? checkbox.check() : checkbox.uncheck());
    });
    return this;
  }

  apply(): Promise<void> {
    this.queue = this.queue.then(async () => {
      await this.restage.click(this.dialog!.getByRole('button', { name: 'Save' }));
    });
    return this.queue;
  }
}

export enum SettingsTab {
  Schema = 'Schema',
  RML = 'RML',
  Engine = 'Engine',
}
