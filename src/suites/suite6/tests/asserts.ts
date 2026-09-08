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
      }) +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Runner(
		folder = "Auth"${skip}
	)
	@Test
	public void testAuthRunner() {
	}

	@JPostman.Response(
		folder = "Auth",
		request = "Login user"${extra}
	)
	@Test
	public void loginUser() {
	}
	`) +
      '\n'
    );
  }

  disableRunner(extra: string = ''): string {
    return this.init(',\n\t\tskip = true', extra);
  }

  addRules(): string {
    return (
      this.disableRunner(',\n\t\tasserts = "@"') +
      `
	/**
	 * ReSTage validation function.
	 */
	public boolean validateServerIsActive(Boolean value, int index) {
		return true;
	}

	/**
	 * ReSTage validation function.
	 */
	public boolean validateServerIsLocal(String value, int index) {
		return "local".equals(value);
	}
`
    );
  }

  getJavaFile(): string {
    return this.resources.getJavaFile();
  }

  async validateInit(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.init() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateDisableRunner(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.disableRunner() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddRules(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addRules() + '}';
    assert.strictEqual(actual, expected);
  }
}
