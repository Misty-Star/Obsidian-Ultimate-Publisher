import { DesktopWebAuthResult } from "../../core/desktopWebAuth";
import {
  BilibiliTargetConfig,
  CsdnTargetConfig,
  HaloWebTargetConfig,
  JianshuTargetConfig,
  JuejinTargetConfig,
  PublishTargetConfig,
  WechatTargetConfig,
  XiaohongshuTargetConfig,
  ZhihuTargetConfig,
} from "../../types";

export type WebAuthTargetConfig =
  | ZhihuTargetConfig
  | CsdnTargetConfig
  | JuejinTargetConfig
  | JianshuTargetConfig
  | WechatTargetConfig
  | HaloWebTargetConfig
  | BilibiliTargetConfig
  | XiaohongshuTargetConfig;

export interface WebAuthAccountSummary {
  accountId?: string;
  accountName?: string;
  accountAvatarUrl?: string;
}

export interface BrowserAuthorizer {
  authorize(
    provider: WebAuthTargetConfig["provider"],
  ): Promise<DesktopWebAuthResult>;
}

export function isWebAuthTarget(
  target: PublishTargetConfig,
): target is WebAuthTargetConfig {
  return [
    "zhihu",
    "csdn",
    "juejin",
    "jianshu",
    "wechat",
    "halo-web",
    "bilibili",
    "xiaohongshu",
  ].includes(target.provider);
}

export async function authorizeWebAuthTarget(
  target: WebAuthTargetConfig,
  authorizer: BrowserAuthorizer,
  loadAccountSummary: (
    target: WebAuthTargetConfig,
  ) => Promise<WebAuthAccountSummary>,
): Promise<WebAuthTargetConfig> {
  const authResult = await authorizer.authorize(target.provider);
  const now = new Date().toISOString();
  const authorizedTarget = {
    ...target,
    cookie: authResult.cookie,
    authSource: "browser" as const,
    lastAuthAt: now,
  };
  const accountSummary = await loadAccountSummary(authorizedTarget);

  return {
    ...authorizedTarget,
    ...accountSummary,
    lastValidatedAt: now,
  };
}

export async function validateWebAuthTarget(
  target: WebAuthTargetConfig,
  loadAccountSummary: (
    target: WebAuthTargetConfig,
  ) => Promise<WebAuthAccountSummary>,
): Promise<WebAuthTargetConfig> {
  const now = new Date().toISOString();
  const accountSummary = await loadAccountSummary(target);

  return {
    ...target,
    authSource: target.authSource ?? (target.cookie ? "manual" : undefined),
    ...accountSummary,
    lastValidatedAt: now,
  };
}

export function clearWebAuthTarget(
  target: WebAuthTargetConfig,
): WebAuthTargetConfig {
  return {
    ...target,
    cookie: "",
    authSource: undefined,
    lastAuthAt: undefined,
    lastValidatedAt: undefined,
    accountId: undefined,
    accountName: undefined,
    accountAvatarUrl: undefined,
  };
}
