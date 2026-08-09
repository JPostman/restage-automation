import { ReStage } from '../../restage.js';
import { Resources } from '../../resources.js';
import assert from 'node:assert/strict';

export class Asserts {
  constructor(
    private readonly restage: ReStage,
    private readonly resources: Resources,
  ) {}

  async wizardCreated(): Promise<void> {
    const actual = this.resources.file('src/test/java/io/restage', 'RestageDemo.java');
    const expected = this.resources.normalize(`
package io.restage;

import io.jpostman.annotations.JPostman;

@JPostman.TestNG
public class RestageDemo {

    @JPostman.Context
    JPostman.Runtime<JPostman.Test> runtime;

    @JPostman.ReportContext(details = true)
    JPostman.Report report;

}`);

    assert.strictEqual(actual, expected);
  }
}
