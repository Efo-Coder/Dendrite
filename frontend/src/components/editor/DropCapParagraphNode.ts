import { ParagraphNode } from 'lexical';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedParagraphNode,
} from 'lexical';

// A drop cap is a per-paragraph toggle, not a global setting: this paragraph carries a
// `dropcap` class so CSS can enlarge its ::first-letter. Toggling on/off swaps the node
// between ParagraphNode and this subclass (see useToolbarState.toggleDropCap).
const DROP_CAP_CLASS = 'dropcap';

export class DropCapParagraphNode extends ParagraphNode {
  static getType(): string {
    return 'dropcap-paragraph';
  }

  static clone(node: DropCapParagraphNode): DropCapParagraphNode {
    return new DropCapParagraphNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add(DROP_CAP_CLASS);
    return dom;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);
    if (output.element instanceof HTMLElement) output.element.classList.add(DROP_CAP_CLASS);
    return output;
  }

  // Higher priority than the built-in <p> converter; returns null for plain paragraphs
  // so Lexical falls back to ParagraphNode for those.
  static importDOM(): DOMConversionMap | null {
    return {
      p: (node: HTMLElement) => {
        if (!node.classList.contains(DROP_CAP_CLASS)) return null;
        return {
          conversion: (): DOMConversionOutput => ({ node: $createDropCapParagraphNode() }),
          priority: 1,
        };
      },
    };
  }

  exportJSON(): SerializedParagraphNode {
    return { ...super.exportJSON(), type: DropCapParagraphNode.getType() };
  }

  static importJSON(serializedNode: SerializedParagraphNode): DropCapParagraphNode {
    return $createDropCapParagraphNode().updateFromJSON(serializedNode);
  }
}

export function $isDropCapParagraphNode(
  node: LexicalNode | null | undefined,
): node is DropCapParagraphNode {
  return node instanceof DropCapParagraphNode;
}

export function $createDropCapParagraphNode(): DropCapParagraphNode {
  return new DropCapParagraphNode();
}
