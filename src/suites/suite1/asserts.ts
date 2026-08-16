import { ReStage } from '../../restage.js';
import { Resources } from '../../resources.js';
import assert from 'node:assert/strict';

export class Asserts {
  private readonly resources: Resources;

  constructor(private readonly restage: ReStage) {
    this.resources = new Resources(restage);
  }

  addAuthFolderCode(): string {
    return (
      this.resources.tempate('import org.testng.annotations.Test;\n') +
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
      this.resources.normalize(`
	@JPostman.Response(
		id = "Ref1",
		folder = "Auth",
		request = "Login user",
		cache = ""
	)
	@Test
	public void login() {
	}`) +
      '\n'
    );
  }

  addLoginUserCode(): string {
    return (
      this.addLoginCacheCode() +
      '\n\t' +
      this.resources.normalize(`
	@JPostman.Request(
		id = "Ref2",
		dependsOn = "#Ref1"
	)
	public void setAuthToken(
		JPostman.Test test,
		JPostman.Info info) {
		info.auth("oauth2",
			test.cache("#Ref1:accessToken"));
	}`) +
      '\n'
    );
  }

  addAuthUserCode(): string {
    return (
      this.addLoginUserCode() +
      '\n\t' +
      this.resources.normalize(`
	@JPostman.Response(
		folder = "Auth",
		request = "Get Auth User",
		dependsOn = "#Ref2"
	)
	@Test
	public void me() {
	}`) +
      '\n'
    );
  }

  addRefreshTokenCode(): string {
    return (
      this.addAuthUserCode() +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Call(
		folder = "Auth",
		request = "Refresh token",
		dependsOn = {"#Ref2", "#Ref1"}
	)
	@Test
	public void refresh() {
		runtime.call((t /*test*/, i /*info*/) -> {
			i.body("refreshToken",
				t.cache("#Ref1:refreshToken"));
		});
	}`) +
      '\n'
    );
  }

  getJavaFile(): string {
    return this.resources.load(this.resources.main());
  }

  async validateWizardCreated(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.resources.tempate() + '}';
    assert.strictEqual(actual, expected);
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
    const expected = this.addLoginUserCode() + '}';
    let actual = this.getJavaFile();
    let count = 0;
    while (count++ < 5 && actual != expected) {
      actual = this.getJavaFile();
      await this.restage.sleep();
    }
    assert.strictEqual(actual, expected);
  }

  async validateAddAuthUser(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addAuthUserCode() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateAddRefreshToken(): Promise<void> {
    const actual = this.getJavaFile();
    const expected = this.addRefreshTokenCode() + '}';
    assert.strictEqual(actual, expected);
  }
}
