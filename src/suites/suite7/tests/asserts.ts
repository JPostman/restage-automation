import { ReStage } from '../../../restage.js';
import { Resources } from '../../../resources.js';
import assert from 'node:assert/strict';

export class Asserts {
  private readonly resources: Resources;

  constructor(restage: ReStage) {
    this.resources = new Resources(restage);
  }

  init(skip: string = '', extra: string = ''): string {
    return (
      this.resources.tempate({
        addImport: 'import org.testng.annotations.Test;\n',
        extra,
      }) +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Runner(
		folder = "Auth"${skip}
	)
	@Test
	public void testAuthRunner() {
	}
`) +
      '\n\n\t'
    );
  }

  addResponse(skip: string = '', extra: string = ''): string {
    return (
      this.init(skip) +
      `@JPostman.Response(
		folder = "Auth",
		request = "Login user"${extra}
	)
	@Test
	public void loginUser() {
	}
`
    );
  }

  disableRunner(extra: string = ''): string {
    return this.addResponse(',\n\t\tskip = true', extra);
  }

  customRule(): string {
    return this.disableRunner(',\n\t\tasserts = "@login"');
  }

  inlineAssertion(): string {
    return (
      this.init(',\n\t\tskip = true', '\n\t@JPostman.AssertContext' + '\n\tJPostman.Assert asserts;\n') +
      `@JPostman.Response(
		folder = "Auth",
		request = "Login user",
		asserts = "@login"
	)
	@Test
	public void loginUser() {
		JPostman.Test test = runtime.test();

		System.out.println("Before Assertion");

		// ReSTage assertions start
		asserts.isEqual(test.path("/expiresInSeconds"), 1, "Invalid Value");
		// ReSTage assertions end

		System.out.println("After Assertion");
	}
`
    );
  }

  inlineSoftAssertion(asserts: string = 'soft().', softTrue: string = ''): string {
    return (
      this.init(',\n\t\tskip = true', `\n\t@JPostman.AssertContext${softTrue}` + `\n\tJPostman.Assert asserts;\n`) +
      `@JPostman.Response(
		folder = "Auth",
		request = "Login user",
		asserts = "@login"
	)
	@Test
	public void loginUser() {
		JPostman.Test test = runtime.test();

		System.out.println("Before Assertion");

		// ReSTage assertions start
		asserts.${asserts}isEqual(test.path("/expiresInSeconds"), 1, "Invalid Value");
		// ReSTage assertions end

		System.out.println("After Assertion");
	}
`
    );
  }

  javaContext(): string {
    return this.resources.javaContext();
  }

  async validateInit(): Promise<void> {
    const actual = this.javaContext();
    const expected = this.addResponse() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateDisableRunner(): Promise<void> {
    const actual = this.javaContext();
    const expected = this.disableRunner() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateInvalidStatusCode(): Promise<void> {
    const actual = this.javaContext();
    const expected = this.disableRunner() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateCustomRule(): Promise<void> {
    const actual = this.javaContext();
    const expected = this.customRule() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateInlineRule(): Promise<void> {
    const actual = this.javaContext();
    const expected = this.inlineAssertion() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateInlineRuleSoft(): Promise<void> {
    const actual = this.javaContext();
    const expected = this.inlineSoftAssertion() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateChangeInlineRuleSoft(): Promise<void> {
    const actual = this.javaContext();
    const expected = this.inlineSoftAssertion('', '(\n\t\tsoft = true\n\t)') + '}';
    assert.strictEqual(actual, expected);
  }
}
