import { ReStage } from '../../../restage.js';
import { Resources } from '../../../resources.js';
import assert from 'node:assert/strict';

export class Asserts {
  private readonly resources: Resources;

  constructor(restage: ReStage) {
    this.resources = new Resources(restage);
  }

  init(skip: string = '', extra: string = '', body: string = '\t'): string {
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

	@JPostman.Response(
		folder = "Auth",
		request = "Login user"
	)
	@Test
	public void loginUser() {\n${body}}`) +
      '\n'
    );
  }

  disableRunner(extra: string = '', body: string = '\t'): string {
    return this.init(',\n\t\tskip = true', extra, body);
  }

  initContext(body: string = '\t'): string {
    return this.init(',\n\t\tskip = true', '\n\t@JPostman.AssertContext\n\tJPostman.Assert asserts;\n', body);
  }

  assertContext(body: string = '\t'): string {
    return this.initContext(`\t\tJPostman.Test test = runtime.test();\n` + body);
  }

  addPath(): string {
    return this.initContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/accessToken", "********", "Invalid access token");
		// ReSTage assertions end
	`);
  }

  pathUsername(): string {
    return this.assertContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/user/username", test.get("username"), "Invalid access token");
		// ReSTage assertions end
	`);
  }

  addIsEqual(): string {
    return this.assertContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/user/username", test.get("username"), "Invalid access token")
			.isEqual(test.path("/user/firstName"), "ReStage", "Compare Firstname");
		// ReSTage assertions end
	`);
  }

  addIsTrue(): string {
    return this.assertContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/user/username", test.get("username"), "Invalid access token")
			.isEqual(test.path("/user/firstName"), "ReStage", "Compare Firstname")
			.isTrue(test.path("/servers/[1]/secure"), "Server is secure");
		// ReSTage assertions end
	`);
  }

  addIsFalse(): string {
    return this.assertContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/user/username", test.get("username"), "Invalid access token")
			.isEqual(test.path("/user/firstName"), "ReStage", "Compare Firstname")
			.isTrue(test.path("/servers/[1]/secure"), "Server is secure")
			.isFalse(test.path("/servers/[0]/secure"), "Server is unsecure");
		// ReSTage assertions end
	`);
  }

  addIsNull(): string {
    return this.assertContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/user/username", test.get("username"), "Invalid access token")
			.isEqual(test.path("/user/firstName"), "ReStage", "Compare Firstname")
			.isTrue(test.path("/servers/[1]/secure"), "Server is secure")
			.isFalse(test.path("/servers/[0]/secure"), "Server is unsecure")
			.isNull(test.path("/servers/[0]/host"), "Local host is null");
		// ReSTage assertions end
	`);
  }

  addNotCondition(): string {
    return this.assertContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/user/username", test.get("username"), "Invalid access token")
			.isEqual(test.path("/user/firstName"), "ReStage", "Compare Firstname")
			.isTrue(test.path("/servers/[1]/secure"), "Server is secure")
			.isFalse(test.path("/servers/[0]/secure"), "Server is unsecure")
			.isNull(test.path("/servers/[0]/host"), "Local host is null")
			.notExists("/helloworld")
			.pathNotNull("/servers/[1]/host")
			.isNotNull(test.path("/servers/[1]/host"))
			.isNotEqual(true, false);
		// ReSTage assertions end
	`);
  }

  addAllMatch(): string {
    return this.assertContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/user/username", test.get("username"), "Invalid access token")
			.isEqual(test.path("/user/firstName"), "ReStage", "Compare Firstname")
			.isTrue(test.path("/servers/[1]/secure"), "Server is secure")
			.isFalse(test.path("/servers/[0]/secure"), "Server is unsecure")
			.isNull(test.path("/servers/[0]/host"), "Local host is null")
			.notExists("/helloworld")
			.pathNotNull("/servers/[1]/host")
			.isNotNull(test.path("/servers/[1]/host"))
			.isNotEqual(true, false)
			.allMatch("/servers/[*]/active", Boolean.class, this::validateServerIsActive, "Is Active");
		// ReSTage assertions end
	}

	/**
	 * ReSTage validation function.
	 */
	public boolean validateServerIsActive(Boolean value, int index) {
		return true;
	`);
  }

  addAnyMatch(): string {
    return this.assertContext(`
		// ReSTage assertions start
		asserts.exists("/accessToken")
			.pathEquals("/user/username", test.get("username"), "Invalid access token")
			.isEqual(test.path("/user/firstName"), "ReStage", "Compare Firstname")
			.isTrue(test.path("/servers/[1]/secure"), "Server is secure")
			.isFalse(test.path("/servers/[0]/secure"), "Server is unsecure")
			.isNull(test.path("/servers/[0]/host"), "Local host is null")
			.notExists("/helloworld")
			.pathNotNull("/servers/[1]/host")
			.isNotNull(test.path("/servers/[1]/host"))
			.isNotEqual(true, false)
			.allMatch("/servers/[*]/active", Boolean.class, this::validateServerIsActive, "Is Active")
			.anyMatch("/servers/[*]/name", String.class, this::validateServerIsLocal, "Is Local");
		// ReSTage assertions end
	}

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
	`);
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

  async validateAddPath(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addPath() + '}';
    assert.strictEqual(actual, expected);
  }

  async validatePathUsername(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.pathUsername() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddIsEqual(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addIsEqual() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddIsTrue(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addIsTrue() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddIsFalse(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addIsFalse() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddIsNull(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addIsNull() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddNotCondition(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addNotCondition() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddAllMatch(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addAllMatch() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddAnyMatch(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addAnyMatch() + '}';
    assert.strictEqual(actual, expected);
  }
}
