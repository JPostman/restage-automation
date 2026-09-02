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
      this.resources.normalize(`
  @JPostman.Runner(
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
		dependsOn = LOGIN_REQ`
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

  addAuthUser(classVars: string = '', body: string = ''): string {
    return (
      this.varsLoginUser(classVars + '\n\tprivate final String LOGIN_REQ = "#login";') +
      '\n\t' +
      this.resources.normalize(
        `
  @JPostman.Response(\n\t\t` +
          (classVars
            ? `dependsOn = SET_AUTH`
            : `folder = "Auth",
		request = "Get Auth User"`) +
          `
	)
	@Test
	public void getAuthUser() {
	}
` +
          (body ? '' : '\n') +
          `
	@JPostman.Request(
		id = LOGIN_REQ,
		folder = "Auth",
		request = "Login user"
	)
	public void setAuthToken(
		JPostman.Test test,
		JPostman.Info info) {\n` +
          body +
          `	}`,
      ) +
      '\n'
    );
  }

  authUserRequestBody(classVars: string = ''): string {
    return this.addAuthUser(
      classVars,
      `\t\tinfo.body("username",
			test.get("username"));\n`,
    );
  }

  createAuthRequest(): string {
    return (
      this.authUserRequestBody('\n\tprivate final String SET_AUTH = "#setAuth";') +
      '\n\n\t' +
      this.resources.normalize(`
  @JPostman.Request(
		id = SET_AUTH,
		folder = "Auth",
		request = "Get Auth User"
	)
	public void authRequest(
		JPostman.Test test,
		JPostman.Info info) {
	}`) +
      '\n'
    );
  }

  createAuthToken(): string {
    return (
      this.authUserRequestBody('\n\tprivate final String SET_AUTH = "#setAuth";') +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Request(
		id = SET_AUTH,
		folder = "Auth",
		request = "Get Auth User",
		dependsOn = GET_AUTH
	)
	public void authRequest(
		JPostman.Test test,
		JPostman.Info info) {
		info.sauth("oauth2",
			test.get("accessToken"));
	}`) +
      '\n'
    );
  }

  addRefreshToken(): string {
    return (
      this.createAuthToken() +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Call(
		folder = "Auth",
		request = "Refresh token",
		dependsOn = GET_AUTH
	)
	@Test
	public void refreshToken() {
		runtime.call((t /*test*/, i /*info*/) -> {
			i.sauth("oauth2",
				t.get("accessToken"));
			i.sbody("refreshToken",
				t.get("refreshToken"));
		});
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

  async validateAuthUserRequestBody(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.authUserRequestBody() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateCreateAuthRequest(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.createAuthRequest() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateCreateAuthToken(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.createAuthToken() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddRefreshToken(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.addRefreshToken() + '}';
    assert.strictEqual(actual, expected);
  }
}
