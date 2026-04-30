import { ProviderId } from "../../types";
import { yuqueDefinition } from "./common";
import { ProviderDefinitionMap, AnyProviderDefinition } from "./types";
import { csdnDefinition, juejinDefinition, zhihuDefinition } from "./web";
import { wordpressDefinition } from "./wordpress";
import { githubDefinition, gitlabDefinition } from "./staticSite";
import { localFilesystemDefinition } from "./filesystem";

const providerDefinitionsById = {
  wordpress: wordpressDefinition,
  yuque: yuqueDefinition,
  zhihu: zhihuDefinition,
  csdn: csdnDefinition,
  juejin: juejinDefinition,
  github: githubDefinition,
  gitlab: gitlabDefinition,
  "local-filesystem": localFilesystemDefinition,
} satisfies ProviderDefinitionMap;

const providerDisplayOrder: ProviderId[] = ["wordpress", "yuque", "zhihu", "csdn", "juejin", "github", "gitlab", "local-filesystem"];

export function getProviderDefinitions(): AnyProviderDefinition[] {
  return providerDisplayOrder.map((providerId) => providerDefinitionsById[providerId]);
}

export function getProviderDefinition<TId extends ProviderId>(providerId: TId): ProviderDefinitionMap[TId] {
  return providerDefinitionsById[providerId];
}

export type {
  AnyProviderDefinition,
  AnyProviderPublishDraft,
  ProviderCapabilities,
  ProviderCapabilityFlag,
  ProviderDefinition,
  ProviderDefinitionMap,
  ProviderDraftById,
  ProviderNormalPublishDefinition,
  ProviderSettingsFieldDefinition,
  ProviderSettingsFieldKey,
  ProviderSettingsFieldOption,
  ProviderSettingsFieldType,
  ProviderSettingsForm,
  ProviderTargetById,
} from "./types";
export { hasNormalPublishDefinition } from "./types";
