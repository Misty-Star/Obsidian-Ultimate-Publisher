import { getProviderDefinition } from "../../providers/definitions";
import { PublishableNote } from "../note";
import { NormalPublishExecutionContext } from "./types";

function cloneStringList(values: string[]): string[] {
  return values.slice();
}

export function applyNormalPublishContextToNote(
  note: PublishableNote,
  context?: NormalPublishExecutionContext
): PublishableNote {
  if (!context) {
    return note;
  }

  const nextNote: PublishableNote = {
    ...note,
    frontmatter: {
      ...note.frontmatter,
    },
    attachments: note.attachments.slice(),
    unresolvedAttachments: note.unresolvedAttachments.slice(),
    title: context.common.title || note.title,
    tags: cloneStringList(note.tags),
    categories: cloneStringList(note.categories),
  };

  const definition = getProviderDefinition(context.provider.provider);
  return definition.normalPublish?.applyDraftToNote?.(nextNote, context.provider as never, context.common) ?? nextNote;
}
