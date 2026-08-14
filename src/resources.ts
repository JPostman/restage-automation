import fs from 'node:fs';
import path from 'node:path';
import { ReStage } from './restage.js';

export class Resources {
  readonly root: string;

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
    return this.target('src/test/java/io/restage', 'RestageDemo.java');
  }

  loadPath(paths: string): string {
    return fs.readFileSync(paths, 'utf8');
  }

  writePath(paths: string, data: string | NodeJS.ArrayBufferView): void {
    fs.writeFileSync(paths, data);
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

  tempate(addImport: string = '', wrap: boolean = true): string {
    return (
      this.normalize(
        `
package io.restage;

import io.jpostman.annotations.JPostman;
${addImport}
@JPostman.TestNG
public class RestageDemo {

    @JPostman.Context
    JPostman.Runtime<JPostman.Test> runtime;

` +
          (wrap === false
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
