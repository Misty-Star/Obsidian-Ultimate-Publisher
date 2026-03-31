import { getWebProviderDescriptor, WebAuthProviderId, WebProviderDescriptor } from "./webProviderDescriptors";

export interface DesktopAuthCookie {
  name: string;
  value: string;
  domain: string;
}

export interface DesktopWebAuthRuntime<TWindow = unknown> {
  isSupported(): boolean;
  openBrowserWindow(url: string): Promise<TWindow> | TWindow;
  waitForWindowClose(window: TWindow): Promise<void>;
  closeWindow(window: TWindow): Promise<void> | void;
  readCookies(window: TWindow): Promise<DesktopAuthCookie[]>;
}

export interface DesktopWebAuthResult {
  provider: WebAuthProviderId;
  descriptor: WebProviderDescriptor;
  cookie: string;
  cookies: DesktopAuthCookie[];
}

interface DesktopWebAuthOptions {
  pollIntervalMs?: number;
  maxWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export function filterCookiesForDomain(
  cookies: DesktopAuthCookie[],
  targetDomain: string
): DesktopAuthCookie[] {
  return cookies.filter((cookie) => {
    const domain = cookie.domain.trim();
    return (
      domain === targetDomain ||
      domain === `.${targetDomain}` ||
      domain.endsWith(`.${targetDomain}`)
    );
  });
}

export function buildCookieHeader(cookies: DesktopAuthCookie[]): string {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

function hasNamedAuthCookie(cookies: DesktopAuthCookie[], authCookieNames: string[]): boolean {
  if (authCookieNames.length === 0) {
    return cookies.length > 0;
  }

  const cookieNames = new Set(
    cookies
      .map((cookie) => cookie.name.trim())
      .filter(Boolean)
  );

  return authCookieNames.some((name) => cookieNames.has(name));
}

type ElectronBrowserWindow = {
  loadURL(url: string): Promise<void> | void;
  once(event: string, listener: () => void): void;
  close?: () => void;
  isDestroyed?: () => boolean;
  webContents: {
    session: {
      cookies: {
        get(filter: Record<string, unknown>): Promise<DesktopAuthCookie[]>;
      };
    };
  };
};

function getElectronRemote(): any {
  if (typeof window === "undefined") {
    return undefined;
  }

  const electronWindow = window as typeof window & {
    require?: (moduleName: string) => any;
  };

  return electronWindow.require?.("@electron/remote");
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createWindowClosedError(displayName: string): Error {
  return new Error(`${displayName} authorization window was closed before cookies were captured.`);
}

export function createDesktopWebAuthRuntime(): DesktopWebAuthRuntime<ElectronBrowserWindow> {
  return {
    isSupported(): boolean {
      const remote = getElectronRemote();
      return Boolean(remote?.BrowserWindow && remote?.getCurrentWindow);
    },
    async openBrowserWindow(url: string): Promise<ElectronBrowserWindow> {
      const remote = getElectronRemote();
      if (!remote?.BrowserWindow || !remote?.getCurrentWindow) {
        throw new Error("Desktop web authorization requires Electron BrowserWindow support.");
      }

      const parentWindow = remote.getCurrentWindow();
      const authWindow = new remote.BrowserWindow({
        parent: parentWindow,
        width: 900,
        height: 750,
        show: true,
        modal: true,
        webPreferences: {
          nativeWindowOpen: true,
          nodeIntegration: false,
          contextIsolation: true,
        },
      }) as ElectronBrowserWindow;

      await authWindow.loadURL(url);
      return authWindow;
    },
    waitForWindowClose(windowHandle: ElectronBrowserWindow): Promise<void> {
      return new Promise((resolve) => {
        windowHandle.once("closed", () => resolve());
      });
    },
    closeWindow(windowHandle: ElectronBrowserWindow): void {
      if (windowHandle.isDestroyed?.()) {
        return;
      }
      windowHandle.close?.();
    },
    readCookies(windowHandle: ElectronBrowserWindow): Promise<DesktopAuthCookie[]> {
      return windowHandle.webContents.session.cookies.get({});
    },
  };
}

export function createDesktopWebAuthService(): DesktopWebAuthService<ElectronBrowserWindow> {
  return new DesktopWebAuthService(createDesktopWebAuthRuntime());
}

export class DesktopWebAuthService<TWindow = unknown> {
  private readonly pollIntervalMs: number;
  private readonly maxWaitMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly runtime: DesktopWebAuthRuntime<TWindow>,
    options: DesktopWebAuthOptions = {}
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 250;
    this.maxWaitMs = options.maxWaitMs ?? 120000;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async authorize(provider: WebAuthProviderId): Promise<DesktopWebAuthResult> {
    if (!this.runtime.isSupported()) {
      throw new Error("Desktop web authorization requires the Obsidian desktop Electron runtime.");
    }

    const descriptor = getWebProviderDescriptor(provider);
    const authWindow = await this.runtime.openBrowserWindow(descriptor.loginUrl);
    let windowClosed = false;
    void this.runtime.waitForWindowClose(authWindow).then(() => {
      windowClosed = true;
    });

    const startedAt = Date.now();
    while (Date.now() - startedAt <= this.maxWaitMs) {
      if (windowClosed) {
        throw createWindowClosedError(descriptor.displayName);
      }

      let cookies: DesktopAuthCookie[];
      try {
        cookies = await this.runtime.readCookies(authWindow);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (windowClosed || /destroyed/i.test(message)) {
          throw createWindowClosedError(descriptor.displayName);
        }
        throw error;
      }

      const filteredCookies = filterCookiesForDomain(cookies, descriptor.cookieDomain);
      const hasAuthCookie = hasNamedAuthCookie(filteredCookies, descriptor.authCookieNames);
      const cookie = buildCookieHeader(filteredCookies);
      if (cookie && hasAuthCookie) {
        await this.runtime.closeWindow(authWindow);
        return {
          provider,
          descriptor,
          cookie,
          cookies: filteredCookies,
        };
      }

      await this.sleep(this.pollIntervalMs);
    }

    await this.runtime.closeWindow(authWindow);
    throw new Error(`${descriptor.displayName} authorization timed out before cookies were captured.`);
  }
}
