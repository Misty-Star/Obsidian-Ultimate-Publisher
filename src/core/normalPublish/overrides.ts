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

  switch (context.provider.provider) {
    case "wordpress":
      nextNote.slug = context.provider.slug;
      nextNote.excerpt = context.provider.excerpt;
      nextNote.tags = cloneStringList(context.provider.tags);
      nextNote.categories = cloneStringList(context.provider.categories);
      break;
    case "yuque":
      nextNote.slug = context.provider.slug;
      break;
    case "csdn":
      nextNote.excerpt = context.provider.excerpt;
      nextNote.tags = cloneStringList(context.provider.tags);
      nextNote.categories = cloneStringList(context.provider.categories);
      break;
    default:
      break;
  }

  return nextNote;
}
