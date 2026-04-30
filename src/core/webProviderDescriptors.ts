export type WebAuthProviderId =
  | "zhihu"
  | "csdn"
  | "juejin"
  | "jianshu"
  | "wechat"
  | "halo-web"
  | "bilibili"
  | "xiaohongshu";

export interface WebProviderDescriptor {
  provider: WebAuthProviderId;
  displayName: string;
  loginUrl: string;
  cookieDomain: string;
  authCookieNames: string[];
}

const WEB_PROVIDER_DESCRIPTORS: Record<
  WebAuthProviderId,
  WebProviderDescriptor
> = {
  zhihu: {
    provider: "zhihu",
    displayName: "Zhihu",
    loginUrl: "https://www.zhihu.com/signin",
    cookieDomain: "zhihu.com",
    authCookieNames: ["z_c0"],
  },
  csdn: {
    provider: "csdn",
    displayName: "CSDN",
    loginUrl: "https://passport.csdn.net/login",
    cookieDomain: "csdn.net",
    authCookieNames: ["UserName"],
  },
  juejin: {
    provider: "juejin",
    displayName: "Juejin",
    loginUrl: "https://juejin.cn/login",
    cookieDomain: "juejin.cn",
    authCookieNames: ["sessionid", "sessionid_ss"],
  },
  jianshu: {
    provider: "jianshu",
    displayName: "Jianshu",
    loginUrl: "https://www.jianshu.com/sign_in",
    cookieDomain: "jianshu.com",
    authCookieNames: ["remember_user_token"],
  },
  wechat: {
    provider: "wechat",
    displayName: "WeChat Official Account",
    loginUrl: "https://mp.weixin.qq.com/",
    cookieDomain: "mp.weixin.qq.com",
    authCookieNames: ["slave_sid", "slave_user"],
  },
  "halo-web": {
    provider: "halo-web",
    displayName: "Halo Web",
    loginUrl: "https://halo.example.com/console/login",
    cookieDomain: "halo.example.com",
    authCookieNames: ["SESSION", "halo_session"],
  },
  bilibili: {
    provider: "bilibili",
    displayName: "Bilibili",
    loginUrl: "https://passport.bilibili.com/login",
    cookieDomain: "bilibili.com",
    authCookieNames: ["SESSDATA", "bili_jct"],
  },
  xiaohongshu: {
    provider: "xiaohongshu",
    displayName: "Xiaohongshu",
    loginUrl: "https://www.xiaohongshu.com/login",
    cookieDomain: "xiaohongshu.com",
    authCookieNames: ["web_session"],
  },
};

export function getWebProviderDescriptor(
  provider: WebAuthProviderId,
): WebProviderDescriptor {
  return WEB_PROVIDER_DESCRIPTORS[provider];
}

export function getWebProviderDescriptors(): WebProviderDescriptor[] {
  return Object.values(WEB_PROVIDER_DESCRIPTORS);
}
