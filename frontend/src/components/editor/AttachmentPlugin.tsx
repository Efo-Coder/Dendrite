import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodes, COMMAND_PRIORITY_EDITOR, createCommand, LexicalCommand } from 'lexical';
import { useEffect } from 'react';

import { $createAttachmentNode, AttachmentNode, AttachmentPayload } from './AttachmentNode';

export const INSERT_ATTACHMENT_COMMAND: LexicalCommand<AttachmentPayload> = createCommand(
  'INSERT_ATTACHMENT_COMMAND',
);

export default function AttachmentPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([AttachmentNode])) {
      throw new Error('AttachmentPlugin: AttachmentNode not registered on editor');
    }

    return editor.registerCommand<AttachmentPayload>(
      INSERT_ATTACHMENT_COMMAND,
      (payload) => {
        editor.update(() => {
          $insertNodes([$createAttachmentNode(payload)]);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
