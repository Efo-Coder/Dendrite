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
import ResizableImage from '../components/ResizableImage';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback } from 'react';

interface ImageComponentProps {
  src: string;
  altText: string;
  width: number;
  height: number;
  alignment: 'left' | 'center' | 'right';
  maintainAspectRatio: boolean;
  nodeKey: string;
}

function ImageComponent({ src, altText, width, height, alignment, maintainAspectRatio, nodeKey }: ImageComponentProps) {
  const [editor] = useLexicalComposerContext();

  const onWidthChange = useCallback(
    (newWidth: number) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setWidth(newWidth);
        }
      });
    },
    [editor, nodeKey]
  );

  const onHeightChange = useCallback(
    (newHeight: number) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setHeight(newHeight);
        }
      });
    },
    [editor, nodeKey]
  );

  const onAlignmentChange = useCallback(
    (newAlignment: 'left' | 'center' | 'right') => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setAlignment(newAlignment);
        }
      });
    },
    [editor, nodeKey]
  );

  const onDelete = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.remove();
      }
    });
  }, [editor, nodeKey]);

  const onAspectRatioChange = useCallback(
    (locked: boolean) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setMaintainAspectRatio(locked);
        }
      });
    },
    [editor, nodeKey]
  );

  return (
    <ResizableImage
      src={src}
      altText={altText}
      initialWidth={width}
      initialHeight={height}
      initialAlignment={alignment}
      initialMaintainAspectRatio={maintainAspectRatio}
      onWidthChange={onWidthChange}
      onHeightChange={onHeightChange}
      onAlignmentChange={onAlignmentChange}
      onAspectRatioChange={onAspectRatioChange}
      onDelete={onDelete}
    />
  );
}

export interface ImagePayload {
  altText: string;
  src: string;
  width?: number;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
  maintainAspectRatio?: boolean;
  key?: NodeKey;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    src: string;
    width: number;
    height: number;
    alignment: 'left' | 'center' | 'right';
    maintainAspectRatio: boolean;
  },
  SerializedLexicalNode
>;

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src } = domNode;

    // Try to extract width from data attribute first, then from style
    let width = 100;
    const dataWidth = domNode.getAttribute('data-width');
    if (dataWidth) {
      width = parseInt(dataWidth, 10);
    } else {
      const widthMatch = domNode.style.width.match(/(\d+)%/);
      if (widthMatch) {
        width = parseInt(widthMatch[1], 10);
      }
    }

    // Try to extract height from data attribute first, then from style
    let height = 300;
    const dataHeight = domNode.getAttribute('data-height');
    if (dataHeight) {
      height = parseInt(dataHeight, 10);
    } else {
      const heightMatch = domNode.style.height.match(/(\d+)px/);
      if (heightMatch) {
        height = parseInt(heightMatch[1], 10);
      }
    }

    // Try to extract alignment from data attribute first, then from float/margin style
    let alignment: 'left' | 'center' | 'right' = 'left';
    const dataAlignment = domNode.getAttribute('data-alignment');
    if (dataAlignment === 'center' || dataAlignment === 'right' || dataAlignment === 'left') {
      alignment = dataAlignment;
    } else {
      const float = domNode.style.float;
      if (float === 'left') {
        alignment = 'left';
      } else if (float === 'right') {
        alignment = 'right';
      } else if (domNode.style.marginLeft === 'auto' && domNode.style.marginRight === 'auto') {
        alignment = 'center';
      }
    }

    const maintainAspectRatio = domNode.getAttribute('data-maintain-aspect-ratio') === 'true';
    const node = $createImageNode({ altText, src, width, height, alignment, maintainAspectRatio });
    return { node };
  }
  return null;
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: number;
  __height: number;
  __alignment: 'left' | 'center' | 'right';
  __maintainAspectRatio: boolean;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__alignment,
      node.__maintainAspectRatio,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, src, width, height, alignment, maintainAspectRatio } = serializedNode;
    const node = $createImageNode({
      altText,
      src,
      width,
      height,
      alignment,
      maintainAspectRatio: maintainAspectRatio ?? false,
    });
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText);
    element.className = 'editor-image';

    // Store metadata as data attributes
    element.setAttribute('data-width', String(this.__width));
    element.setAttribute('data-height', String(this.__height));
    element.setAttribute('data-alignment', this.__alignment);
    element.setAttribute('data-maintain-aspect-ratio', String(this.__maintainAspectRatio));

    // Apply basic styling
    element.style.width = `${this.__width}%`;
    element.style.height = `${this.__height}px`;
    element.style.borderRadius = '4px';
    element.style.display = 'block';

    if (this.__alignment === 'left') {
      element.style.float = 'left';
      element.style.marginRight = '16px';
    } else if (this.__alignment === 'right') {
      element.style.float = 'right';
      element.style.marginLeft = '16px';
    } else {
      element.style.marginLeft = 'auto';
      element.style.marginRight = 'auto';
    }

    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    width: number = 100,
    height: number = 300,
    alignment: 'left' | 'center' | 'right' = 'left',
    maintainAspectRatio: boolean = false,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
    this.__alignment = alignment;
    this.__maintainAspectRatio = maintainAspectRatio;
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      src: this.getSrc(),
      width: this.__width,
      height: this.__height,
      alignment: this.__alignment,
      maintainAspectRatio: this.__maintainAspectRatio,
      type: 'image',
      version: 1,
    };
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  setWidth(width: number): void {
    const writable = this.getWritable();
    writable.__width = width;
  }

  setHeight(height: number): void {
    const writable = this.getWritable();
    writable.__height = height;
  }

  setAlignment(alignment: 'left' | 'center' | 'right'): void {
    const writable = this.getWritable();
    writable.__alignment = alignment;
  }

  setMaintainAspectRatio(maintainAspectRatio: boolean): void {
    const writable = this.getWritable();
    writable.__maintainAspectRatio = maintainAspectRatio;
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    const className = config.theme.image;
    if (className !== undefined) {
      div.className = className;
    }
    // Use display block but prevent selection issues
    div.style.display = 'block';
    div.style.userSelect = 'none';
    div.contentEditable = 'false';
    return div;
  }

  updateDOM(): boolean {
    // Component manages visual state locally – no remount needed on node updates
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  getWidth(): number {
    return this.__width;
  }

  getHeight(): number {
    return this.__height;
  }

  getAlignment(): 'left' | 'center' | 'right' {
    return this.__alignment;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        alignment={this.__alignment}
        maintainAspectRatio={this.__maintainAspectRatio}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createImageNode({
  altText,
  src,
  width = 100,
  height = 300,
  alignment = 'left',
  maintainAspectRatio = false,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, width, height, alignment, maintainAspectRatio, key));
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
