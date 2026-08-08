# ReSTage Automation

Minimal Playwright automation bootstrap for ReSTage Studio.

## Run

Place your local extension at:

```text
restage-studio.vsix
```

Then run:

```bash
npm install
npm start
```

The automation deletes the temporary `restage-demo` project, installs the local VSIX, opens ReSTage, fills the Project Wizard fields, and pauses for recording.

## Action pacing

Playwright uses a 1 second action delay by default through `slowMo`.

Optional override:

```text
RESTAGE_ACTION_DELAY_MS=2000
```

Concise action output looks like:

```text
[UI] fill getByRole('textbox', { name: 'artifactId' }) = "automation"
[UI] select getByLabel('Test framework') = "TestNG"
```


## Engine mode

If `.vscode/settings.json` exists, the launcher opens this folder as the VS Code workspace, so ReSTage can use the workspace engine settings (for example remote mode/server URL). If the file is absent, the launcher does not open this workspace and ReSTage uses its normal/default local configuration.

## Isolated VS Code session

Automation uses a temporary `--extensions-dir`. Normal user-installed extensions are not loaded.
ReSTage is installed from `restage-studio.vsix`; extensions explicitly installed by the test
(such as Red Hat Java) are installed into the isolated automation extension directory.

AI/Chat and extension auto-updates are disabled in the temporary automation user profile.

## Inspector

`npm start` owns the single Playwright connection to VS Code. After all configured automation steps complete it opens Playwright Inspector from that same connection. This is important for VS Code webviews such as **ReSTage API Schema**, because the original connection already owns the webview frame and can inspect controls inside it.

While `npm start` is still running, a second terminal can request Inspector without creating another Playwright/CDP session:

```bash
npm run inspect
```

To explicitly verify/focus a ReSTage webview before Inspector opens, pass its iframe title:

```bash
npm run inspect -- "ReSTage API Schema"
```

The running automation logs how many inspectable controls it can see in that webview before opening Inspector. `npm run inspect` does not delete the demo project, install the VSIX, launch another VS Code window, or create a second Playwright browser connection.

## Test resources

Reusable input and expected-comparison files live in `resources/`. Use `Resources` from `src/resources.ts` to resolve a file path, read text/binary content, or compare an actual generated file with an expected resource.

```ts
const resources = new Resources();
const schema = resources.text('openapi.yaml');
const uploadPath = resources.file('sample.json');
resources.assertText(actualFile, 'expected-output.txt');
```
