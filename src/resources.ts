import fs from 'node:fs';
import path from 'node:path';

export class Resources {
  readonly root: string;

  constructor(root = path.join(process.cwd(), 'resources')) {
    this.root = path.resolve(root);
  }

  file(name: string): string {
    const resolved = path.resolve(this.root, name);
    const rootPrefix = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;

    if (resolved !== this.root && !resolved.startsWith(rootPrefix)) {
      throw new Error(`Resource path escapes resources folder: ${name}`);
    }

    if (!fs.existsSync(resolved)) {
      throw new Error(`Resource not found: ${resolved}`);
    }

    return resolved;
  }

  text(name: string): string {
    return fs.readFileSync(this.file(name), 'utf8');
  }

  bytes(name: string): Buffer {
    return fs.readFileSync(this.file(name));
  }

  compareText(actualFile: string, expectedResource: string): boolean {
    const actual = normalizeText(fs.readFileSync(actualFile, 'utf8'));
    const expected = normalizeText(this.text(expectedResource));
    return actual === expected;
  }

  assertText(actualFile: string, expectedResource: string): void {
    if (this.compareText(actualFile, expectedResource)) {
      return;
    }

    throw new Error(`File comparison failed:\n` + `  actual:   ${path.resolve(actualFile)}\n` + `  expected: ${this.file(expectedResource)}`);
  }

  compareBytes(actualFile: string, expectedResource: string): boolean {
    return fs.readFileSync(actualFile).equals(this.bytes(expectedResource));
  }

  assertBytes(actualFile: string, expectedResource: string): void {
    if (this.compareBytes(actualFile, expectedResource)) {
      return;
    }

    throw new Error(`Binary file comparison failed:\n` + `  actual:   ${path.resolve(actualFile)}\n` + `  expected: ${this.file(expectedResource)}`);
  }
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n');
}
