import { ReStage } from '../../../restage.js';
import { Resources } from '../../../resources.js';
import assert from 'node:assert/strict';

export class Asserts {
  private readonly resources: Resources;

  constructor(restage: ReStage) {
    this.resources = new Resources(restage);
  }

  init(newId: string = ''): string {
    return (
      this.resources.tempate({
        addImport: 'import org.testng.annotations.Test;\n',
      }) +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Runner(
		${newId}folder = "Auth"
	)
	@Test
	public void testAuthRunner() {
	}

	@JPostman.Response(
		id = "Ref1",
		folder = "Auth",
		request = "Login user",
		cache = "",
		dependsOn = ""
	)
	@Test
	public void loginUser() {
	}

	@JPostman.Call(
		folder = "Auth",
		request = "Get Auth User",
		dependsOn = "#Ref1"
	)
	@Test
	public void getAuthUser() {
		runtime.call((t /*test*/, i /*info*/) -> {
			i.auth("oauth2",
				t.cache("#Ref1:accessToken"));
		});
	}

	@JPostman.Call(
		folder = "Auth",
		request = "Refresh token",
		dependsOn = "#Ref1"
	)
	@Test
	public void refreshToken() {
		runtime.call((t /*test*/, i /*info*/) -> {
			i.auth("oauth2",
				t.cache("#Ref1:accessToken"));
			i.body("refreshToken",
				t.cache("#Ref1:refreshToken"));
		});
	}`) +
      '\n'
    );
  }

  addChainFolder(): string {
    return (
      this.init(`id = "Ref3",\n\t\t`) +
      '\n\t' +
      this.resources.normalize(`
  @JPostman.Runner(
		folder = "Chain",
		dependsOn = {"#Ref2", "#Ref3"}
	)
	@Test
	public void testChainRunner() {
	}

	@JPostman.Request(
		id = "Ref2",
		folder = "Chain",
		dependsOn = "#Ref1"
	)
	public void testChainRequest(
		JPostman.Test test,
		JPostman.Info info) {
		info.auth("oauth2",
			test.cache("#Ref1:accessToken"));
		info.params("chainId",
			"chain-1001");
		info.path("{{itemId}}",
			"item-1002");
		info.query("{{token}}",
			"query-token");
		info.headers("refreshToken",
			test.cache("#Ref1:refreshToken"));
		info.sheaders("X-Chain-Token",
			"header-token");
		info.sbody("{{chainSource}}",
			"Hello World");
	}`) +
      '\n'
    );
  }

  async getJavaFile(): Promise<string> {
    return this.resources.mainUpdated();
  }

  async validateInit(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.init() + '}';
    assert.strictEqual(actual, expected);
  }

  async validateChainFolder(): Promise<void> {
    const actual = await this.getJavaFile();
    const expected = this.addChainFolder() + '}';
    assert.strictEqual(actual, expected);
  }
}
