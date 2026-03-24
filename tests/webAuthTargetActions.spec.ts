import { describe, expect, it } from "vitest";
import { createWordpressTarget, createZhihuTarget } from "../src/settings";
import {
  authorizeWebAuthTarget,
  clearWebAuthTarget,
  isWebAuthTarget,
  validateWebAuthTarget,
} from "../src/ui/settings/webAuthTargetActions";

describe("web auth target actions", () => {
  it("identifies which targets support web auth", () => {
    expect(isWebAuthTarget(createZhihuTarget())).toBe(true);
    expect(isWebAuthTarget(createWordpressTarget())).toBe(false);
  });

  it("marks a draft as browser-authorized after successful auth", async () => {
    const result = await authorizeWebAuthTarget(
      createZhihuTarget(),
      {
        authorize: async () => ({
          provider: "zhihu",
          descriptor: {
            provider: "zhihu",
            displayName: "Zhihu",
            loginUrl: "https://www.zhihu.com/signin",
            cookieDomain: "zhihu.com",
          },
          cookie: "z_c0=demo",
          cookies: [],
        }),
      },
      async () => ({
        accountId: "1001",
        accountName: "demo",
      })
    );

    expect(result.cookie).toBe("z_c0=demo");
    expect(result.authSource).toBe("browser");
    expect(result.accountId).toBe("1001");
    expect(result.accountName).toBe("demo");
    expect(typeof result.lastAuthAt).toBe("string");
    expect(typeof result.lastValidatedAt).toBe("string");
  });

  it("preserves cookie source while refreshing account summary on validation", async () => {
    const result = await validateWebAuthTarget(
      {
        ...createZhihuTarget(),
        cookie: "z_c0=demo",
        authSource: "manual",
      },
      async () => ({
        accountId: "1002",
        accountName: "validated",
      })
    );

    expect(result.authSource).toBe("manual");
    expect(result.accountName).toBe("validated");
    expect(typeof result.lastValidatedAt).toBe("string");
  });

  it("clears only auth state and keeps provider defaults", () => {
    const cleared = clearWebAuthTarget({
      ...createZhihuTarget(),
      cookie: "z_c0=demo",
      authSource: "browser",
      defaultColumnId: "column-1",
      accountName: "demo",
    });

    expect(cleared.cookie).toBe("");
    expect(cleared.authSource).toBeUndefined();
    expect(cleared.accountName).toBeUndefined();
    expect(cleared.defaultColumnId).toBe("column-1");
  });
});
