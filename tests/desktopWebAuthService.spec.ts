import { describe, expect, it } from "vitest";
import {
  buildCookieHeader,
  DesktopWebAuthService,
  filterCookiesForDomain,
} from "../src/core/desktopWebAuth";
import { getWebProviderDescriptor } from "../src/core/webProviderDescriptors";

describe("desktop web auth service", () => {
  it("filters session cookies by provider domain and serializes them", () => {
    const cookies = [
      { name: "z_c0", value: "cookie-1", domain: ".zhihu.com" },
      { name: "session", value: "cookie-2", domain: "api.zhihu.com" },
      { name: "ignore", value: "cookie-3", domain: ".example.com" },
    ];

    expect(filterCookiesForDomain(cookies, "zhihu.com")).toEqual([
      { name: "z_c0", value: "cookie-1", domain: ".zhihu.com" },
      { name: "session", value: "cookie-2", domain: "api.zhihu.com" },
    ]);
    expect(
      buildCookieHeader(filterCookiesForDomain(cookies, "zhihu.com")),
    ).toBe("z_c0=cookie-1; session=cookie-2");
  });

  it("exposes login metadata for supported web providers", () => {
    expect(getWebProviderDescriptor("zhihu")).toMatchObject({
      provider: "zhihu",
      loginUrl: expect.stringContaining("zhihu.com"),
      cookieDomain: "zhihu.com",
    });
    expect(getWebProviderDescriptor("csdn")).toMatchObject({
      provider: "csdn",
      cookieDomain: "csdn.net",
    });
    expect(getWebProviderDescriptor("juejin")).toMatchObject({
      provider: "juejin",
      cookieDomain: "juejin.cn",
    });
    expect(getWebProviderDescriptor("jianshu")).toMatchObject({
      provider: "jianshu",
      cookieDomain: "jianshu.com",
      authCookieNames: ["remember_user_token"],
    });
    expect(getWebProviderDescriptor("wechat")).toMatchObject({
      provider: "wechat",
      cookieDomain: "mp.weixin.qq.com",
    });
    expect(getWebProviderDescriptor("halo-web")).toMatchObject({
      provider: "halo-web",
      cookieDomain: "halo.example.com",
    });
    expect(getWebProviderDescriptor("bilibili")).toMatchObject({
      provider: "bilibili",
      cookieDomain: "bilibili.com",
      authCookieNames: ["SESSDATA", "bili_jct"],
    });
    expect(getWebProviderDescriptor("xiaohongshu")).toMatchObject({
      provider: "xiaohongshu",
      cookieDomain: "xiaohongshu.com",
    });
  });

  it("rejects browser auth when desktop electron APIs are unavailable", async () => {
    const service = new DesktopWebAuthService({
      isSupported: () => false,
      openBrowserWindow: async () => ({ id: "window" }),
      waitForWindowClose: async () => undefined,
      closeWindow: async () => undefined,
      readCookies: async () => [],
    });

    await expect(service.authorize("zhihu")).rejects.toThrow(/desktop/i);
  });

  it("captures cookies and closes the auth window automatically once login succeeds", async () => {
    const closeCalls: Array<unknown> = [];
    let readCount = 0;
    const service = new DesktopWebAuthService(
      {
        isSupported: () => true,
        openBrowserWindow: async (url) => ({ url }),
        waitForWindowClose: async () => new Promise<void>(() => undefined),
        closeWindow: async (windowHandle) => {
          closeCalls.push(windowHandle);
        },
        readCookies: async () => {
          readCount += 1;
          return readCount === 1
            ? []
            : [
                { name: "z_c0", value: "cookie-1", domain: ".zhihu.com" },
                { name: "session", value: "cookie-2", domain: "www.zhihu.com" },
              ];
        },
      },
      { pollIntervalMs: 0, maxWaitMs: 50 },
    );

    await expect(service.authorize("zhihu")).resolves.toMatchObject({
      cookie: "z_c0=cookie-1; session=cookie-2",
      provider: "zhihu",
    });
    expect(closeCalls).toHaveLength(1);
  });

  it("waits for provider auth cookies instead of closing on anonymous login-page cookies", async () => {
    const closeCalls: Array<unknown> = [];
    let readCount = 0;
    const service = new DesktopWebAuthService(
      {
        isSupported: () => true,
        openBrowserWindow: async (url) => ({ url }),
        waitForWindowClose: async () => new Promise<void>(() => undefined),
        closeWindow: async (windowHandle) => {
          closeCalls.push(windowHandle);
        },
        readCookies: async () => {
          readCount += 1;
          return readCount === 1
            ? [{ name: "ttwid", value: "anonymous", domain: ".juejin.cn" }]
            : [
                { name: "ttwid", value: "anonymous", domain: ".juejin.cn" },
                { name: "sessionid", value: "logged-in", domain: ".juejin.cn" },
              ];
        },
      },
      { pollIntervalMs: 0, maxWaitMs: 50 },
    );

    await expect(service.authorize("juejin")).resolves.toMatchObject({
      provider: "juejin",
      cookie: "ttwid=anonymous; sessionid=logged-in",
    });
    expect(readCount).toBe(2);
    expect(closeCalls).toHaveLength(1);
  });

  it("surfaces a friendly close error instead of destroyed when the window is manually closed first", async () => {
    let closed = false;
    const service = new DesktopWebAuthService(
      {
        isSupported: () => true,
        openBrowserWindow: async (url) => ({ url }),
        waitForWindowClose: async () => {
          closed = true;
        },
        closeWindow: async () => undefined,
        readCookies: async () => {
          if (closed) {
            throw new Error("Object has been destroyed");
          }
          return [];
        },
      },
      { pollIntervalMs: 0, maxWaitMs: 20 },
    );

    await expect(service.authorize("zhihu")).rejects.toThrow(/closed/i);
    await expect(service.authorize("zhihu")).rejects.not.toThrow(/destroyed/i);
  });
});
