import { ReStage } from '../../restage.js';
import { Resources } from '../../resources.js';
import assert from 'node:assert/strict';

export class Asserts {
  private readonly resources: Resources;

  constructor(restage: ReStage) {
    this.resources = new Resources(restage);
  }

  addAuthFolderCode(): string {
    return (
      this.resources.tempate({
        addImport: 'import org.testng.annotations.Test;\n',
        classVars: '\n\tprivate final String GET_AUTH = "#getAuth";' + '\n\tprivate final String SET_AUTH = "#setAuth";' + '\n\tprivate final String CACHE_TOKEN = "token";\n\n',
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

  addLoginCacheCode(): string {
    return (
      this.addAuthFolderCode() +
      '\n\t' +
      this.resources.normalize(`@JPostman.Response(
		id = GET_AUTH,
		folder = "Auth",
		request = "Login user",
		cache = CACHE_TOKEN
	)
	public String loginUserAuthToken(
		JPostman.Test test,
		JPostman.Info info) {
		return test.path("accessToken");
	}`) +
      '\n'
    );
  }

  addAuthUserCode(): string {
    return (
      this.addLoginCacheCode() +
      '\n\t' +
      this.resources.normalize(`
	@JPostman.Response(
		folder = "Auth",
		request = "Get Auth User"
	)
	@Test
	public void getAuthUser() {
	}`) +
      '\n'
    );
  }

  addGetAuthUser(): string {
    return (
      this.addLoginCacheCode() +
      '\n\t' +
      this.resources.normalize(`
	@JPostman.Response(
		dependsOn = SET_AUTH
	)
	@Test
	public void getAuthUser() {
	}`) +
      '\n\n'
    );
  }

  addLoginUserCode(): string {
    return (
      this.addGetAuthUser() +
      '\n\t' +
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

  addAuthRequest(): string {
    return (
      this.addGetAuthUser() +
      '\t' +
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
		info.auth("oauth2",
			test.cache(CACHE_TOKEN));
	}`) +
      '\n'
    );
  }

  addRefreshTokenCode(): string {
    return (
      this.addAuthRequest() +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Response(
		folder = "Auth",
		request = "Refresh token"
	)
	@Test
	public void refreshToken() {
	}`) +
      '\n'
    );
  }

  addRefreshTokenAuth(): string {
    return (
      this.addAuthRequest() +
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
			i.auth("oauth2",
				t.cache(CACHE_TOKEN));
		});
	}`) +
      '\n'
    );
  }

  addRefreshBody(): string {
    return (
      this.addAuthRequest() +
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
			i.auth("oauth2",
				t.cache(CACHE_TOKEN));
			i.body("refreshToken",
				t.get(GET_AUTH + "/refreshToken"));
		});
	}`) +
      '\n'
    );
  }

  getJavaFile(): string {
    return this.resources.load(this.resources.main());
  }

  async validateAddAuthFolder(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addAuthFolderCode() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddLoginCache(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addLoginCacheCode() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddLoginUser(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addLoginUserCode() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddAuthUser(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addAuthUserCode() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateUserDependencies(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addAuthRequest() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddRefreshToken(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addRefreshTokenCode() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateRefreshDependencies(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addRefreshTokenAuth() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddRefreshBody(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addRefreshBody() + '}';
    assert.strictEqual(actual, expected);
  }
}
