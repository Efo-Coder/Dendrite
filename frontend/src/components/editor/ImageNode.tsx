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
import { $generateHtmlFromNodes } from '@lexical/html';
import ResizableImage from './ResizableImage';
import { LexicalOnChangeContext } from './LexicalEditorWrapper';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback, useContext } from 'react';

interface ImageComponentProps {
  src: string;
  altText: string;
  width: number;
  height: number;
  aspectRatio: number | null;
  alignment: 'left' | 'center' | 'right';
  maintainAspectRatio: boolean;
  positionLocked: boolean;
  nodeKey: string;
}

function ImageComponent({ src, altText, width, height, aspectRatio, alignment, maintainAspectRatio, positionLocked, nodeKey }: ImageComponentProps) {
  const [editor] = useLexicalComposerContext();
  const onEditorChange = useContext(LexicalOnChangeContext);

  const onSizeChange = useCallback(
    (newWidth: number, newAspectRatio: number) => {
      editor.update(
        () => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.setWidth(newWidth);
            node.setAspectRatio(newAspectRatio);
          }
        },
        {
          discrete: true,
          onUpdate: () => {
            if (onEditorChange) {
              editor.read(() => {
                onEditorChange($generateHtmlFromNodes(editor));
              });
            }
          },
        }
      );
    },
    [editor, nodeKey, onEditorChange]
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

  const onPositionLockChange = useCallback(
    (locked: boolean) => {
      const scrollEl = editor.getRootElement()?.closest('.scrollbar-overlay') as HTMLElement | null;
      const savedScrollTop = scrollEl?.scrollTop ?? 0;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setPositionLocked(locked);
        }
      }, {
        onUpdate: () => {
          if (scrollEl) scrollEl.scrollTop = savedScrollTop;
        },
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
      initialAspectRatio={aspectRatio}
      initialAlignment={alignment}
      initialMaintainAspectRatio={maintainAspectRatio}
      initialPositionLocked={positionLocked}
      onSizeChange={onSizeChange}
      onAlignmentChange={onAlignmentChange}
      onAspectRatioChange={onAspectRatioChange}
      onPositionLockChange={onPositionLockChange}
      onDelete={onDelete}
    />
  );
}

export interface ImagePayload {
  altText: string;
  src: string;
  width?: number;
  // Fallback box height (px) used only until the image is calibrated to an aspectRatio.
  height?: number;
  // Box aspect ratio (width/height). null = not yet calibrated → derived on first render.
  aspectRatio?: number | null;
  alignment?: 'left' | 'center' | 'right';
  maintainAspectRatio?: boolean;
  positionLocked?: boolean;
  key?: NodeKey;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    src: string;
    width: number;
    height: number;
    aspectRatio: number | null;
    alignment: 'left' | 'center' | 'right';
    maintainAspectRatio: boolean;
    positionLocked: boolean;
  },
  SerializedLexicalNode
>;

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src } = domNode;

    let width = 100;
    const dataWidth = domNode.getAttribute('data-width');
    if (dataWidth) {
      width = parseFloat(dataWidth);
    } else {
      const widthMatch = domNode.style.width.match(/([\d.]+)%/);
      if (widthMatch) {
        width = parseFloat(widthMatch[1]);
      }
    }

    let height = 300;
    const dataHeight = domNode.getAttribute('data-height');
    if (dataHeight) {
      height = parseFloat(dataHeight);
    } else {
      const heightMatch = domNode.style.height.match(/([\d.]+)px/);
      if (heightMatch) {
        height = parseFloat(heightMatch[1]);
      }
    }

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
    const positionLocked = domNode.getAttribute('data-position-locked') === 'true';
    // Legacy images lack data-aspect-ratio → null triggers calibration from the
    // current box on first render (data-height is the fallback height until then).
    const dataAspect = domNode.getAttribute('data-aspect-ratio');
    const aspectRatio = dataAspect ? parseFloat(dataAspect) : null;
    const node = $createImageNode({ altText, src, width, height, aspectRatio, alignment, maintainAspectRatio, positionLocked });
    return { node };
  }
  return null;
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: number;
  // Fallback box height (px), used only until __aspectRatio is calibrated.
  __height: number;
  // Box aspect ratio (width/height). null until calibrated from the first render.
  __aspectRatio: number | null;
  __alignment: 'left' | 'center' | 'right';
  __maintainAspectRatio: boolean;
  __positionLocked: boolean;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__aspectRatio,
      node.__alignment,
      node.__maintainAspectRatio,
      node.__positionLocked,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, src, width, height, aspectRatio, alignment, maintainAspectRatio, positionLocked } = serializedNode;
    const node = $createImageNode({
      altText,
      src,
      width,
      height,
      aspectRatio: aspectRatio ?? null,
      alignment,
      maintainAspectRatio: maintainAspectRatio ?? false,
      positionLocked: positionLocked ?? false,
    });
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText);
    element.className = 'editor-image';

    element.setAttribute('data-width', String(this.__width));
    element.setAttribute('data-height', String(this.__height));
    element.setAttribute('data-alignment', this.__alignment);
    element.setAttribute('data-maintain-aspect-ratio', String(this.__maintainAspectRatio));
    element.setAttribute('data-position-locked', String(this.__positionLocked));

    element.style.width = `${this.__width}%`;
    // Calibrated images carry an aspect ratio so the box scales with the column
    // (height derived) and never re-letterboxes; uncalibrated ones keep the px height.
    if (this.__aspectRatio != null) {
      element.setAttribute('data-aspect-ratio', String(this.__aspectRatio));
      element.style.aspectRatio = String(this.__aspectRatio);
      element.style.height = 'auto';
    } else {
      element.style.height = `${this.__height}px`;
    }
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
      img: (_node: Node) => ({
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
    aspectRatio: number | null = null,
    alignment: 'left' | 'center' | 'right' = 'left',
    maintainAspectRatio: boolean = false,
    positionLocked: boolean = false,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
    this.__aspectRatio = aspectRatio;
    this.__alignment = alignment;
    this.__maintainAspectRatio = maintainAspectRatio;
    this.__positionLocked = positionLocked;
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      src: this.getSrc(),
      width: this.__width,
      height: this.__height,
      aspectRatio: this.__aspectRatio,
      alignment: this.__alignment,
      maintainAspectRatio: this.__maintainAspectRatio,
      positionLocked: this.__positionLocked,
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

  setAspectRatio(aspectRatio: number): void {
    const writable = this.getWritable();
    writable.__aspectRatio = aspectRatio;
  }

  setAlignment(alignment: 'left' | 'center' | 'right'): void {
    const writable = this.getWritable();
    writable.__alignment = alignment;
  }

  setMaintainAspectRatio(maintainAspectRatio: boolean): void {
    const writable = this.getWritable();
    writable.__maintainAspectRatio = maintainAspectRatio;
  }

  setPositionLocked(positionLocked: boolean): void {
    const writable = this.getWritable();
    writable.__positionLocked = positionLocked;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    const className = config.theme.image;
    if (className !== undefined) {
      div.className = className;
    }
    div.style.display = 'block';
    div.style.userSelect = 'none';
    div.contentEditable = 'false';
    return div;
  }

  updateDOM(): boolean {
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
        aspectRatio={this.__aspectRatio}
        alignment={this.__alignment}
        maintainAspectRatio={this.__maintainAspectRatio}
        positionLocked={this.__positionLocked}
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
  aspectRatio = null,
  alignment = 'left',
  maintainAspectRatio = false,
  positionLocked = false,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, width, height, aspectRatio, alignment, maintainAspectRatio, positionLocked, key));
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
