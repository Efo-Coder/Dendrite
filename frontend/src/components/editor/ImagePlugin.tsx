import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodes, COMMAND_PRIORITY_EDITOR, createCommand, LexicalCommand } from 'lexical';
import { useEffect } from 'react';

import { $createImageNode, ImageNode, ImagePayload } from './ImageNode';
import { attachmentService } from '../../services/attachment.service';

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
  'INSERT_IMAGE_COMMAND',
);

export default function ImagesPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    const unregisterInsert = editor.registerCommand<ImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        editor.update(() => {
          const imageNode = $createImageNode(payload);
          $insertNodes([imageNode]);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    const handlePaste = async (event: Event) => {
      const clipboardEvent = event as ClipboardEvent;
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          clipboardEvent.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          try {
            const result = await attachmentService.uploadImage(file);
            const url = attachmentService.getAttachmentUrl(result.url);
            editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
              altText: result.filename || file.name || 'Pasted Image',
              src: url,
            });
          } catch (error) {
            console.error('Fehler beim Einfügen des Bildes:', error);
          }
          break;
        }
      }
    };

    const unregisterRoot = editor.registerRootListener((root, prev) => {
      prev?.removeEventListener('paste', handlePaste);
      root?.addEventListener('paste', handlePaste);
    });

    return () => {
      unregisterInsert();
      unregisterRoot();
      // cleanup on unmount
      const root = editor.getRootElement();
      root?.removeEventListener('paste', handlePaste);
    };
  }, [editor]);

  return null;
}
