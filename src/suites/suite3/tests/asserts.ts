import { ReStage } from '../../../restage.js';
import { Resources } from '../../../resources.js';
import assert from 'node:assert/strict';

export class Asserts {
  private readonly resources: Resources;

  constructor(restage: ReStage) {
    this.resources = new Resources(restage);
  }

  addAuthFolderCode(classVars: string = ''): string {
    return (
      this.resources.tempate({
        addImport: 'import org.testng.annotations.Test;\n',
        classVars,
      }) +
      '\n\t' +
      this.resources.normalize(`@JPostman.Runner(
		folder = "Auth"
	)
	@Test
	public void testAuthRunner() {
	}`) +
      '\n'
    );
  }

  updateLoginUser(): string {
    return (
      this.addAuthFolderCode('\n\tprivate final String GET_AUTH = "#auth";' + '\n\tprivate final String LOGIN = "login";\n\n') +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Response(
		id = GET_AUTH,
		folder = "Auth",
		request = "Login user",
		tags = LOGIN
	)
	@Test
	public void loginUserAuthToken() {
	}`) +
      '\n'
    );
  }

  varsLoginUser(classVars: string = ''): string {
    return (
      this.addAuthFolderCode(classVars + '\n\tprivate final String GET_AUTH = "#auth";' + '\n\tprivate final String LOGIN = "login";\n\n') +
      '\n\t' +
      this.resources.normalize(
        `
  @JPostman.Response(
		id = GET_AUTH,\n\t\t` +
          (classVars
            ? `tags = LOGIN,
		dependsOn = SET_AUTH`
            : `folder = "Auth",
		request = "Login user",
		tags = LOGIN`) +
          `\n\t)
	@Test
	public void loginUserAuthToken() {
		JPostman.Test test = runtime.test();
		JPostman.Info info = runtime.info();
	
		JPostman.Ref<String> accessToken = info.ref(test.path("accessToken"));
	
		test.secret("accessToken",
			accessToken.get());
	
		test.secret("refreshToken",
			test.path("refreshToken"));
	
		test.plain("username",
			test.get("{{username}}"));
	}`,
      ) +
      '\n'
    );
  }

  addAuthUser(): string {
    return (
      this.varsLoginUser('\n\tprivate final String SET_AUTH = "#token";') +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Response(
		folder = "Auth",
		request = "Get Auth User"
	)
	@Test
	public void getAuthUser() {
	}


	@JPostman.Request(
		id = SET_AUTH,
		folder = "Auth",
		request = "Login user"
	)
	public void setAuthToken(
		JPostman.Test test,
		JPostman.Info info) {
	}`) +
      '\n'
    );
  }

  async getJavaFile(): Promise<string> {
    return this.resources.mainUpdated();
  }

  async validateAddAuthFolder(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.addAuthFolderCode() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateUpdateLoginUser(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.updateLoginUser() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateVarsLoginUser(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.varsLoginUser() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddAuthUser(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.addAuthUser() + '}';
    assert.strictEqual(actual, expected);
  }
}
