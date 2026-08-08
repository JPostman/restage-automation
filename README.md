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

The project uses one Inspector implementation: `src/inspect.ts`.

While the automation VS Code window is running, use:

```bash
npm run inspect
```

This attaches a Playwright protocol client to the browser binding published by the running automation and opens Playwright Inspector without launching a second VS Code window. Because Inspector runs in its own helper process, it can also open while the main automation is stopped on a TypeScript/Node debugger breakpoint.

Tests can call `await restage.inspect()`. The main automation launches the same `inspect.ts` helper and waits until Inspector is resumed/closed.

In VS Code **Run and Debug**, choose **Playwright Inspector (Anytime)** for the manual Inspector command.

## Test resources

Reusable input and expected-comparison files live in `resources/`. Use `Resources` from `src/resources.ts` to resolve a file path, read text/binary content, or compare an actual generated file with an expected resource.

```ts
const resources = new Resources();
const schema = resources.text('openapi.yaml');
const uploadPath = resources.file('sample.json');
resources.assertText(actualFile, 'expected-output.txt');
```

## VS Code debugging

This project includes `.vscode/launch.json` and `.vscode/tasks.json` for TypeScript breakpoints.

1. Open the `restage-automation` folder in VS Code.
2. Set a breakpoint in any file under `src/tests/`.
3. Open **Run and Debug** (`Ctrl+Shift+D`).
4. Choose **ReSTage: Debug All Tests** or **ReSTage: Debug Test Class**.
5. Press `F5` to debug, or `Ctrl+F5` to run without debugging.

**ReSTage: Debug Test Class** lets you choose `wizard`, `actions`, `schema`, `environment`, or `rml`. Earlier stages required to create the expected ReSTage UI state run automatically before the selected class. Source maps map `dist` JavaScript back to the original `.ts` files, so breakpoints belong in `src/tests/*.ts`.
