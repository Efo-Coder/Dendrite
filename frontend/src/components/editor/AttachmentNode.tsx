import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import { $applyNodeReplacement, DecoratorNode, $getNodeByKey } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback } from 'react';
import { Download, X, FileText, FileImage, FileSpreadsheet, File as FileIcon } from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function fileIconFor(fileType: string) {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
  if (fileType === 'application/pdf' || fileType.startsWith('text/') || fileType.includes('word')) return FileText;
  return FileIcon;
}

// ─── Component ─────────────────────────────────────────────
interface AttachmentComponentProps {
  src: string;
  filename: string;
  fileType: string;
  fileSize: number;
  nodeKey: string;
}

function AttachmentComponent({ src, filename, fileType, fileSize, nodeKey }: AttachmentComponentProps) {
  const [editor] = useLexicalComposerContext();
  const Icon = fileIconFor(fileType);

  const onDelete = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isAttachmentNode(node)) node.remove();
    });
  }, [editor, nodeKey]);

  return (
    <span className="editor-attachment-chip group">
      <Icon className="w-5 h-5 shrink-0 text-(--accent)" />
      <span className="min-w-0 flex flex-col leading-tight">
        <span className="text-sm text-(--ink) truncate">{filename}</span>
        <span className="text-[11px] text-(--ink-dim)">{formatFileSize(fileSize)}</span>
      </span>
      <a
        href={src}
        download={filename}
        target="_blank"
        rel="noopener noreferrer"
        className="icon-btn-md rounded-lg transition-colors hover:text-(--accent) shrink-0"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </a>
      {editor.isEditable() && (
        <button
          type="button"
          onClick={onDelete}
          className="icon-btn-md rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title="Remove attachment"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </span>
  );
}

// ─── Node ──────────────────────────────────────────────────
export interface AttachmentPayload {
  src: string;
  filename: string;
  fileType: string;
  fileSize: number;
  attachmentId?: string;
  key?: NodeKey;
}

export type SerializedAttachmentNode = Spread<
  {
    src: string;
    filename: string;
    fileType: string;
    fileSize: number;
    attachmentId: string;
  },
  SerializedLexicalNode
>;

function convertAttachmentElement(domNode: HTMLElement): null | DOMConversionOutput {
  const src = domNode.getAttribute('href') || domNode.getAttribute('data-src') || '';
  const filename = domNode.getAttribute('data-filename') || 'File';
  const fileType = domNode.getAttribute('data-filetype') || '';
  const fileSize = parseInt(domNode.getAttribute('data-filesize') || '0', 10);
  const attachmentId = domNode.getAttribute('data-attachment-id') || '';
  return { node: $createAttachmentNode({ src, filename, fileType, fileSize, attachmentId }) };
}

export class AttachmentNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __filename: string;
  __fileType: string;
  __fileSize: number;
  __attachmentId: string;

  static getType(): string {
    return 'attachment';
  }

  static clone(node: AttachmentNode): AttachmentNode {
    return new AttachmentNode(
      node.__src,
      node.__filename,
      node.__fileType,
      node.__fileSize,
      node.__attachmentId,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedAttachmentNode): AttachmentNode {
    const { src, filename, fileType, fileSize, attachmentId } = serializedNode;
    return $createAttachmentNode({ src, filename, fileType, fileSize, attachmentId });
  }

  // Only convert anchors we tagged ourselves; real links fall through to LinkNode.
  static importDOM(): DOMConversionMap | null {
    return {
      a: (node: HTMLElement) => {
        if (!node.hasAttribute('data-lexical-attachment')) return null;
        return { conversion: convertAttachmentElement, priority: 1 };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('a');
    element.setAttribute('data-lexical-attachment', 'true');
    element.setAttribute('href', this.__src);
    element.setAttribute('data-filename', this.__filename);
    element.setAttribute('data-filetype', this.__fileType);
    element.setAttribute('data-filesize', String(this.__fileSize));
    element.setAttribute('data-attachment-id', this.__attachmentId);
    element.setAttribute('download', this.__filename);
    element.className = 'editor-attachment';
    element.textContent = this.__filename;
    return { element };
  }

  constructor(
    src: string,
    filename: string,
    fileType: string,
    fileSize: number,
    attachmentId: string = '',
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__filename = filename;
    this.__fileType = fileType;
    this.__fileSize = fileSize;
    this.__attachmentId = attachmentId;
  }

  exportJSON(): SerializedAttachmentNode {
    return {
      src: this.__src,
      filename: this.__filename,
      fileType: this.__fileType,
      fileSize: this.__fileSize,
      attachmentId: this.__attachmentId,
      type: 'attachment',
      version: 1,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'block';
    div.style.userSelect = 'none';
    div.contentEditable = 'false';
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <AttachmentComponent
        src={this.__src}
        filename={this.__filename}
        fileType={this.__fileType}
        fileSize={this.__fileSize}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createAttachmentNode({
  src,
  filename,
  fileType,
  fileSize,
  attachmentId = '',
  key,
}: AttachmentPayload): AttachmentNode {
  return $applyNodeReplacement(new AttachmentNode(src, filename, fileType, fileSize, attachmentId, key));
}

export function $isAttachmentNode(node: LexicalNode | null | undefined): node is AttachmentNode {
  return node instanceof AttachmentNode;
}
