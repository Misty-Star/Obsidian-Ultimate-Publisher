import { replaceAssetReferences } from "./markdown";
import { PublishableNote } from "./note";
import { MediaUploadResult, PublisherProvider } from "./providers";
import { PublishTargetConfig } from "../types";

export interface PreparedPublishableNote extends PublishableNote {
  mediaReplacements: Array<{
    sourcePath: string;
    replacementPath: string;
  }>;
}

async function resolveReplacement(
  provider: PublisherProvider,
  note: PublishableNote,
  target: PublishTargetConfig,
  sourcePath: string
): Promise<MediaUploadResult> {
  const asset = note.attachments.find((item) => item.sourcePath === sourcePath);
  if (!asset) {
    throw new Error(`Missing attachment for source path: ${sourcePath}`);
  }

  const support = provider.getMediaSupport(target as never);
  if (support.mode === "native-upload") {
    if (!provider.uploadAsset) {
      throw new Error(`${target.name} cannot upload local assets because uploadAsset() is not implemented.`);
    }
    return provider.uploadAsset(asset, note, target as never);
  }

  if (support.mode === "local-copy") {
    if (!provider.copyAsset) {
      throw new Error(`${target.name} cannot copy local assets because copyAsset() is not implemented.`);
    }
    return provider.copyAsset(asset, note, target as never);
  }

  const files = note.attachments.map((item) => item.sourcePath).join(", ");
  throw new Error(`${target.name} does not support local Obsidian images yet: ${files}`);
}

export async function prepareNoteForPublish(
  note: PublishableNote,
  target: PublishTargetConfig,
  provider: PublisherProvider
): Promise<PreparedPublishableNote> {
  const missingAttachment = note.unresolvedAttachments.find((asset) => asset.reason === "missing");
  if (missingAttachment) {
    throw new Error(`Missing local image asset: ${missingAttachment.reference.rawTarget}`);
  }

  if (note.attachments.length === 0) {
    return {
      ...note,
      mediaReplacements: [],
    };
  }

  const support = provider.getMediaSupport(target as never);
  if (support.mode === "unsupported") {
    const files = note.attachments.map((asset) => asset.sourcePath).join(", ");
    throw new Error(`${target.name} does not support local Obsidian images yet: ${files}`);
  }

  const resolvedPaths = new Map<string, string>();
  const replacements = [];

  for (const asset of note.attachments) {
    let replacementPath = resolvedPaths.get(asset.sourcePath);
    if (!replacementPath) {
      const result = await resolveReplacement(provider, note, target, asset.sourcePath);
      replacementPath = result.url;
      resolvedPaths.set(asset.sourcePath, replacementPath);
    }

    replacements.push({
      reference: asset.reference,
      replacementPath,
    });
  }

  return {
    ...note,
    markdown: replaceAssetReferences(note.markdown, replacements),
    mediaReplacements: [...resolvedPaths.entries()].map(([sourcePath, replacementPath]) => ({
      sourcePath,
      replacementPath,
    })),
  };
}
