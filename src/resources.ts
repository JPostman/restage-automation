import fs from 'node:fs';
import path from 'node:path';
import { ReStage } from './restage.js';

export class Resources {
  readonly root: string;

  constructor(private readonly restage: ReStage) {
    this.root = path.join(process.cwd());
  }

  loadPath(paths: string): string {
    return fs.readFileSync(paths, 'utf8');
  }

  check(resolved: string, name: string): string {
    if (!fs.existsSync(resolved)) {
      throw new Error(`Resource not found: ${resolved}`);
    }
    return path.resolve(resolved, name);
  }

  load(resolved: string, name: string): string {
    return this.loadPath(this.check(resolved, name));
  }

  resourceFile(name: string, normalize: boolean = true): string {
    return this.normalize(this.load(path.resolve(this.root, 'resources'), name), normalize);
  }

  file(paths: string, name: string, normalize: boolean = true): string {
    return this.normalize(this.load(path.resolve(this.restage.rootDir, paths), name), normalize);
  }

  normalize(value: string, normalize: boolean = true): string {
    if (!normalize) return value;
    return value.replace(/\r\n/g, '\n').trim();
  }
}
