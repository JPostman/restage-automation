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

  addLoginUserCode(): string {
    return (
      this.addAuthFolderCode() +
      '\n\t' +
      this.resources.normalize(`
	@JPostman.Response(
		id = "Ref1",
		cache = "token",
		verify = 200,
		dependsOn = "#username"
	)
	public String loginUser() {
		return runtime.test().path("accessToken");
	}

	@JPostman.Request(
		id = "username",
		folder = "Auth",
		request = "Login user"
	)
	public void setUserName(
		JPostman.Test test,
		JPostman.Info info) {
		info.body("username",
			test.get("username"));
	}`) +
      '\n'
    );
  }

  addAuthUserCode(): string {
    return (
      this.addLoginUserCode() +
      '\n\t' +
      this.resources.normalize(`
	@JPostman.Call(
		folder = "Auth",
		request = "Get Auth User",
		dependsOn = "#Ref1"
	)
	@Test
	public void authUserCall() {
		runtime.call((t /*test*/, i /*info*/) -> {
			i.auth("oauth2",
				t.cache("#Ref1"));
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
}
