import fs from 'node:fs';
import path from 'node:path';
import { ReStage } from './restage.js';

export class Resources {
  readonly root: string;

  public static DEFAULT_FILE = 'RestageDemoTest.java';

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

  main(file: string = Resources.DEFAULT_FILE): string {
    return this.target('src/test/java/io/restage', file);
  }

  asserts(file: string = 'asserts.ini'): string {
    return this.target('src/test/resources', file);
  }

  loadPath(paths: string): string {
    return fs.readFileSync(paths, 'utf8');
  }

  deletePath(paths: string): void {
    if (fs.existsSync(paths)) fs.rmSync(paths);
  }

  writePath(paths: string, data: string | NodeJS.ArrayBufferView): void {
    if (fs.existsSync(paths)) fs.writeFileSync(paths, data);
  }

  update(paths: string, before: string, after: string): void {
    const source = this.loadPath(paths);
    if (!source.includes(before)) {
      throw new Error('before was not found.');
    }
    this.writePath(paths, source.replace(before, after));
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

  getJavaFile(): string {
    return this.load(this.main());
  }

  tempate(opt?: { addImport?: string; extra?: string; wrap?: boolean }): string {
    return (
      this.normalize(
        `
package io.restage;

import io.jpostman.annotations.JPostman;
${opt?.addImport || ''}
@JPostman.TestNG
public class RestageDemoTest {
${opt?.extra || ''}
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
