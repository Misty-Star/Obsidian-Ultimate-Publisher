import { PublishTargetConfig } from "../../types";
import { createI18n, Translator } from "../../i18n";
import {
  getProviderDefinition,
  ProviderSettingsFieldDefinition,
  ProviderSettingsFieldKey,
} from "../../providers/definitions";

export type ModalFieldKey = ProviderSettingsFieldKey;
export type ModalFieldDefinition = ProviderSettingsFieldDefinition;

const DEFAULT_I18N = createI18n("en");

function cloneTarget<TTarget extends PublishTargetConfig>(target: TTarget): TTarget {
  return JSON.parse(JSON.stringify(target)) as TTarget;
}

export function getModalFieldDefinitions(
  target: PublishTargetConfig,
  i18n: Translator = DEFAULT_I18N
): ModalFieldDefinition[] {
  const definition = getProviderDefinition(target.provider);
  return definition.settingsForm.getFields(target as never, i18n);
}

export function readFieldValue(target: PublishTargetConfig, key: ModalFieldKey): string | boolean {
  const definition = getProviderDefinition(target.provider);
  return definition.settingsForm.readFieldValue(target as never, key);
}

export function applyFieldValue(
  target: PublishTargetConfig,
  key: ModalFieldKey,
  value: string | boolean
): PublishTargetConfig {
  const definition = getProviderDefinition(target.provider);
  const nextTarget = definition.normalizeTarget(cloneTarget(target) as never);
  return definition.settingsForm.applyFieldValue(nextTarget as never, key, value);
}
