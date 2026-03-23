import { cloneTarget, normalizeTarget } from "../../settings";
import { PublishContentFormat, PublishTargetConfig, WordpressStatus } from "../../types";

export type ModalFieldKey =
  | "enabled"
  | "name"
  | "endpoint"
  | "username"
  | "appPassword"
  | "defaultStatus"
  | "contentFormat"
  | "baseUrl"
  | "repo"
  | "token"
  | "publicLevel"
  | "outputDir"
  | "yamlType"
  | "assetDirName";

type ModalFieldType = "toggle" | "text" | "password" | "dropdown";

interface ModalFieldOption {
  value: string;
  label: string;
}

export interface ModalFieldDefinition {
  key: ModalFieldKey;
  label: string;
  description?: string;
  type: ModalFieldType;
  options?: ModalFieldOption[];
}

const COMMON_FIELDS: ModalFieldDefinition[] = [
  { key: "enabled", label: "Enabled", type: "toggle" },
  { key: "name", label: "Display name", type: "text" },
];

const WORDPRESS_FIELDS: ModalFieldDefinition[] = [
  { key: "endpoint", label: "Endpoint", description: "Example: https://example.com", type: "text" },
  { key: "username", label: "Username", type: "text" },
  { key: "appPassword", label: "Application password", type: "password" },
  {
    key: "defaultStatus",
    label: "Default status",
    type: "dropdown",
    options: [
      { value: "draft", label: "Draft" },
      { value: "publish", label: "Publish" },
      { value: "private", label: "Private" },
      { value: "pending", label: "Pending" },
    ],
  },
  {
    key: "contentFormat",
    label: "Publish format",
    description: "Choose whether WordPress receives Markdown text or rendered HTML.",
    type: "dropdown",
    options: [
      { value: "markdown", label: "Markdown" },
      { value: "html", label: "HTML" },
    ],
  },
];

const YUQUE_FIELDS: ModalFieldDefinition[] = [
  { key: "baseUrl", label: "Base URL", type: "text" },
  { key: "repo", label: "Repo", description: "Example: namespace/repo", type: "text" },
  { key: "token", label: "Token", type: "password" },
  {
    key: "publicLevel",
    label: "Public level",
    description: "0 = private, 1 = public",
    type: "dropdown",
    options: [
      { value: "0", label: "Private" },
      { value: "1", label: "Public" },
    ],
  },
];

const LOCAL_EXPORT_FIELDS: ModalFieldDefinition[] = [
  { key: "outputDir", label: "Output directory", description: "Absolute directory path on the local machine.", type: "text" },
  {
    key: "yamlType",
    label: "YAML type",
    type: "dropdown",
    options: [
      { value: "default", label: "Default" },
      { value: "hexo", label: "Hexo" },
    ],
  },
  { key: "assetDirName", label: "Asset directory name", type: "text" },
];

export function getModalFieldDefinitions(target: PublishTargetConfig): ModalFieldDefinition[] {
  if (target.provider === "wordpress") {
    return [...COMMON_FIELDS, ...WORDPRESS_FIELDS];
  }

  if (target.provider === "yuque") {
    return [...COMMON_FIELDS, ...YUQUE_FIELDS];
  }

  return [...COMMON_FIELDS, ...LOCAL_EXPORT_FIELDS];
}

export function readFieldValue(target: PublishTargetConfig, key: ModalFieldKey): string | boolean {
  switch (key) {
    case "enabled":
      return target.enabled;
    case "name":
      return target.name;
    case "endpoint":
      return target.provider === "wordpress" ? target.endpoint : "";
    case "username":
      return target.provider === "wordpress" ? target.username : "";
    case "appPassword":
      return target.provider === "wordpress" ? target.appPassword : "";
    case "defaultStatus":
      return target.provider === "wordpress" ? target.defaultStatus : "";
    case "contentFormat":
      return target.provider === "wordpress" ? target.contentFormat : "";
    case "baseUrl":
      return target.provider === "yuque" ? target.baseUrl : "";
    case "repo":
      return target.provider === "yuque" ? target.repo : "";
    case "token":
      return target.provider === "yuque" ? target.token : "";
    case "publicLevel":
      return target.provider === "yuque" ? String(target.publicLevel) : "";
    case "outputDir":
      return target.provider === "local-export" ? target.outputDir : "";
    case "yamlType":
      return target.provider === "local-export" ? target.yamlType : "";
    case "assetDirName":
      return target.provider === "local-export" ? target.assetDirName : "";
  }
}

export function applyFieldValue(
  target: PublishTargetConfig,
  key: ModalFieldKey,
  value: string | boolean
): PublishTargetConfig {
  const nextTarget = normalizeTarget(cloneTarget(target));

  switch (key) {
    case "enabled":
      nextTarget.enabled = Boolean(value);
      return nextTarget;
    case "name":
      nextTarget.name = String(value).trim() || nextTarget.name;
      return nextTarget;
    case "endpoint":
      if (nextTarget.provider === "wordpress") {
        nextTarget.endpoint = String(value).trim();
      }
      return nextTarget;
    case "username":
      if (nextTarget.provider === "wordpress") {
        nextTarget.username = String(value).trim();
      }
      return nextTarget;
    case "appPassword":
      if (nextTarget.provider === "wordpress") {
        nextTarget.appPassword = String(value).trim();
      }
      return nextTarget;
    case "defaultStatus":
      if (nextTarget.provider === "wordpress") {
        nextTarget.defaultStatus = String(value) as WordpressStatus;
      }
      return nextTarget;
    case "contentFormat":
      if (nextTarget.provider === "wordpress") {
        nextTarget.contentFormat = String(value) as PublishContentFormat;
      }
      return nextTarget;
    case "baseUrl":
      if (nextTarget.provider === "yuque") {
        nextTarget.baseUrl = String(value).trim();
      }
      return nextTarget;
    case "repo":
      if (nextTarget.provider === "yuque") {
        nextTarget.repo = String(value).trim();
      }
      return nextTarget;
    case "token":
      if (nextTarget.provider === "yuque") {
        nextTarget.token = String(value).trim();
      }
      return nextTarget;
    case "publicLevel":
      if (nextTarget.provider === "yuque") {
        nextTarget.publicLevel = Number(value) === 1 ? 1 : 0;
      }
      return nextTarget;
    case "outputDir":
      if (nextTarget.provider === "local-export") {
        nextTarget.outputDir = String(value).trim();
      }
      return nextTarget;
    case "yamlType":
      if (nextTarget.provider === "local-export") {
        nextTarget.yamlType = String(value) === "hexo" ? "hexo" : "default";
      }
      return nextTarget;
    case "assetDirName":
      if (nextTarget.provider === "local-export") {
        nextTarget.assetDirName = String(value).trim();
      }
      return nextTarget;
  }
}
