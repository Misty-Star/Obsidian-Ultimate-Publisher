export type WebAuthProviderId = "zhihu" | "csdn" | "juejin";

export interface WebProviderDescriptor {
  provider: WebAuthProviderId;
  displayName: string;
  loginUrl: string;
  cookieDomain: string;
}

const WEB_PROVIDER_DESCRIPTORS: Record<WebAuthProviderId, WebProviderDescriptor> = {
  zhihu: {
    provider: "zhihu",
    displayName: "Zhihu",
    loginUrl: "https://www.zhihu.com/signin",
    cookieDomain: "zhihu.com",
  },
  csdn: {
    provider: "csdn",
    displayName: "CSDN",
    loginUrl: "https://passport.csdn.net/login",
    cookieDomain: "csdn.net",
  },
  juejin: {
    provider: "juejin",
    displayName: "Juejin",
    loginUrl: "https://juejin.cn/login",
    cookieDomain: "juejin.cn",
  },
};

export function getWebProviderDescriptor(provider: WebAuthProviderId): WebProviderDescriptor {
  return WEB_PROVIDER_DESCRIPTORS[provider];
}

export function getWebProviderDescriptors(): WebProviderDescriptor[] {
  return Object.values(WEB_PROVIDER_DESCRIPTORS);
}
