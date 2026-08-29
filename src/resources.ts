import fs from 'node:fs';
import path from 'node:path';
import { ReStage } from './restage.js';

export class Resources {
  readonly root: string;
  protected previousContent: string = '';

  public static DEFAULT_FILE = 'RestageDemo.java';

  constructor(private readonly restage: ReStage) {
    this.root = path.join(process.cwd());
  }

  source(...paths: string[]): string {
    return path.resolve(this.root, ...paths);
  }

  target(...paths: string[]): string {
    return path.resolve(this.restage.rootDir, ...paths);
  }

  resources(file: string): string {
    return this.source('resources', file);
  }

  main(): string {
    return this.target('src/test/java/io/restage', Resources.DEFAULT_FILE);
  }

  loadPath(paths: string): string {
    return fs.readFileSync(paths, 'utf8');
  }

  writePath(paths: string, data: string | NodeJS.ArrayBufferView): void {
    if (fs.existsSync(paths)) {
      fs.writeFileSync(paths, data);
    }
  }

  check(paths: string): string {
    if (!fs.existsSync(paths)) {
      throw new Error(`File not found: ${paths}`);
    }
    return paths;
  }

  load(paths: string, normalize: boolean = true): string {
    return this.normalize(this.loadPath(this.check(paths)), normalize);
  }

  normalize(value: string, normalize: boolean = true): string {
    if (!normalize) return value;
    return value.replace(/\r\n/g, '\n').trim();
  }

  async mainReset(): Promise<void> {
    this.previousContent = this.load(this.main());
  }

  async mainUpdated(): Promise<string> {
    return await this.waitFileUpdate(this.main());
  }

  async waitFileUpdate(paths: string, normalize: boolean = true): Promise<string> {
    let stableReads = 0;
    let actual = '';
    while (stableReads++ < 10) {
      actual = this.load(paths, normalize);
      if (actual !== this.previousContent) {
        return (this.previousContent = actual);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return actual;
  }

  tempate(opt?: { addImport?: string; classVars?: string; wrap?: boolean }): string {
    return (
      this.normalize(
        `
package io.restage;

import io.jpostman.annotations.JPostman;
${opt?.addImport || ''}
@JPostman.TestNG
public class RestageDemo {
${opt?.classVars || ''}
    @JPostman.Context
    JPostman.Runtime<JPostman.Test> runtime;

` +
          (opt?.wrap === false
            ? `    @JPostman.ReportContext(details = true)`
            : `    @JPostman.ReportContext(
    	details = true
    )`) +
          `
    JPostman.Report report;`,
      ) + '\n\n'
    );
  }
}
