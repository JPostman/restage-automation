import type { Frame, Page } from 'playwright-core';

const DEFAULT_TIMEOUT_MS = 120_000;

export async function frameByTitle(page: Page, title: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Frame> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (frame === page.mainFrame() || frame.isDetached()) continue;

      try {
        const iframe = await frame.frameElement();
        if ((await iframe.getAttribute('title')) === title) {
          return frame;
        }
      } catch {
        // VS Code can replace webview frames while a view is opening.
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Frame not found: ${title}`);
}
