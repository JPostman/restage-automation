import { ReStage } from '../../../restage.js';
import { Resources } from '../../../resources.js';
import { RmlAsserts } from '../../base/rml_asserts.js';
import assert from 'node:assert/strict';

export class AssetsRun extends RmlAsserts {
  private readonly resources: Resources;

  constructor(protected readonly restage: ReStage) {
    super(restage);
    this.resources = new Resources(restage);
  }

  async checkStatusCode(statusCode: string): Promise<void> {
    const context = this.resources.loadPath(this.resources.asserts());
    assert.ok(context.includes(`[default]\n${statusCode}`));
  }

  async checkLoginUserTest(): Promise<void> {
    const context = this.resources.loadPath(this.resources.asserts());
    assert.ok(context.includes(`[loginUserTest,@login]\nextends=default\n?exists=invalid`));
  }

  async invalidStatusCode(val: Promise<string>, section: string = 'default'): Promise<void> {
    assert.strictEqual(
      await val,
      `java.lang.AssertionError: Status code mismatch: expected [201] but found [200]

Assertion file: asserts.ini
Assertion section: [${section}]
Assertion rule: statusCode=201
(@JPostmanResponse: method=loginUser, tags=, namespace=<default>, folder=Auth, request=Login user, executor=<default>)

\tat io.restage.RestageDemoTest.loginUser(RestageDemoTest.java)`,
    );
  }

  async addCustomRule(val: Promise<string>): Promise<void> {
    assert.strictEqual(
      await val,
      `java.lang.AssertionError: Path not found: invalid

Assertion file: asserts.ini
Assertion section: [@login]
Assertion rule: exists=invalid
(@JPostmanResponse: method=loginUser, tags=, namespace=<default>, folder=Auth, request=Login user, executor=<default>)

\tat io.restage.RestageDemoTest.loginUser(RestageDemoTest.java)`,
    );
  }

  async statusAndCustomRule(val: Promise<string>): Promise<void> {
    assert.strictEqual(
      await val,
      `java.lang.AssertionError: The following asserts failed:
	Status code mismatch: expected [201] but found [200],
	Path not found: invalid

Assertion file: asserts.ini
Assertion section: [@login]
(@JPostmanResponse: method=loginUser, tags=, namespace=<default>, folder=Auth, request=Login user, executor=<default>)

\tat io.restage.RestageDemoTest.loginUser(RestageDemoTest.java)`,
    );
  }

  async inlineRule(val: Promise<string>): Promise<void> {
    assert.strictEqual(
      await val,
      `java.lang.AssertionError: Invalid Value expected [1] but found [1800]
\tat io.restage.RestageDemoTest.loginUser(RestageDemoTest.java:41)`,
    );
  }

  async inlineRuleSoft(val: Promise<string>): Promise<void> {
    assert.strictEqual(
      await val,
      `java.lang.AssertionError: The following asserts failed:
	Status code mismatch: expected [201] but found [200],
	Path not found: invalid

Assertion file: asserts.ini
Assertion section: [@login]
(@JPostmanResponse: method=loginUser, tags=, namespace=<default>, folder=Auth, request=Login user, executor=<default>)


The following asserts failed:
	Invalid Value expected [1] but found [1800]
	at io.restage.RestageDemoTest.loginUser(RestageDemoTest.java)`,
    );
  }

  async checkTestLog(exists: boolean = false): Promise<void> {
    const text = await this.restage.testLog();
    assert.ok(text.includes('Before Assertion'));
    assert.ok(text.includes('After Assertion') == exists);
  }
}
