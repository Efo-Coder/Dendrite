import { ListItemNode } from '@lexical/list';
import type { SerializedListItemNode } from '@lexical/list';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  RangeSelection,
  Spread,
} from 'lexical';

export type TimerConfig = { type: 'countdown'; totalMs: number };

export type SerializedTimerListItemNode = Spread<
  { type: 'timer-list-item'; timerConfig: TimerConfig; resetId: string },
  SerializedListItemNode
>;

export const RING_CIRCUMFERENCE = 2 * Math.PI * 10;

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}


function createRingSvg(resetId: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('timer-ring');
  svg.dataset.resetId = resetId;

  const track = document.createElementNS(ns, 'circle');
  track.setAttribute('cx', '11');
  track.setAttribute('cy', '11');
  track.setAttribute('r', '10');
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', 'currentColor');
  track.setAttribute('stroke-width', '2.5');
  track.setAttribute('stroke-opacity', '0.15');
  svg.appendChild(track);

  const progress = document.createElementNS(ns, 'circle');
  progress.setAttribute('cx', '11');
  progress.setAttribute('cy', '11');
  progress.setAttribute('r', '10');
  progress.setAttribute('fill', 'none');
  progress.setAttribute('stroke', '#2f88f5');
  progress.setAttribute('stroke-width', '2.5');
  progress.setAttribute('stroke-linecap', 'round');
  progress.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));
  progress.setAttribute('stroke-dashoffset', String(RING_CIRCUMFERENCE));
  progress.classList.add('timer-ring-progress');
  svg.appendChild(progress);

  return svg;
}

export class TimerListItemNode extends ListItemNode {
  __timerConfig: TimerConfig;
  __resetId: string;

  static getType(): string {
    return 'timer-list-item';
  }

  static clone(node: TimerListItemNode): TimerListItemNode {
    return new TimerListItemNode(
      node.__timerConfig,
      node.__resetId,
      node.__checked,
      node.__value,
      node.__key,
    );
  }

  constructor(
    timerConfig: TimerConfig,
    resetId: string = generateId(),
    checked?: boolean,
    value?: number,
    key?: NodeKey,
  ) {
    super(value, checked, key);
    this.__timerConfig = timerConfig;
    this.__resetId = resetId;
  }

  getTimerConfig(): TimerConfig {
    return this.getLatest().__timerConfig;
  }

  getResetId(): string {
    return this.getLatest().__resetId;
  }

  setTimerConfig(config: TimerConfig): void {
    this.getWritable().__timerConfig = config;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const el = super.createDOM(config);
    el.appendChild(createRingSvg(this.__resetId));
    return el;
  }

  updateDOM(prevNode: ListItemNode, dom: HTMLElement, config: EditorConfig): boolean {
    const recreate = super.updateDOM(prevNode, dom, config);
    if (!dom.querySelector('.timer-ring')) dom.appendChild(createRingSvg(this.__resetId));
    return recreate;
  }

  insertNewAfter(_: RangeSelection, restoreSelection = true): TimerListItemNode {
    const newItem = $createTimerListItemNode(this.__timerConfig);
    newItem.setChecked(false);
    this.insertAfter(newItem, restoreSelection);
    return newItem;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);
    if (output.element) {
      (output.element as HTMLElement).dataset.timerConfig = JSON.stringify(this.__timerConfig);
      (output.element as HTMLElement).dataset.resetId = this.__resetId;
    }
    return output;
  }

  static importDOM(): DOMConversionMap {
    return {
      li: (node: Node) => {
        const el = node as HTMLElement;
        if (!el.dataset.timerConfig) return null;
        return {
          conversion: (domNode: HTMLElement): DOMConversionOutput => {
            let timerConfig: TimerConfig;
            try {
              timerConfig = JSON.parse(domNode.dataset.timerConfig!) as TimerConfig;
            } catch {
              timerConfig = { type: 'countdown', totalMs: 3_600_000 };
            }
            const resetId = domNode.dataset.resetId ?? generateId();
            const checked = domNode.getAttribute('aria-checked') === 'true';
            return { node: new TimerListItemNode(timerConfig, resetId, checked) };
          },
          priority: 1,
        };
      },
    };
  }

  exportJSON(): SerializedTimerListItemNode {
    return {
      ...super.exportJSON(),
      type: 'timer-list-item',
      timerConfig: this.__timerConfig,
      resetId: this.__resetId,
    };
  }

  static importJSON(json: SerializedTimerListItemNode): TimerListItemNode {
    const node = new TimerListItemNode(json.timerConfig);
    node.setChecked(json.checked ?? false);
    node.setValue(json.value ?? 1);
    node.setFormat(json.format);
    node.setIndent(json.indent);
    node.setDirection(json.direction);
    return node;
  }
}

export function $isTimerListItemNode(
  node: LexicalNode | null | undefined,
): node is TimerListItemNode {
  return node instanceof TimerListItemNode;
}

export function $createTimerListItemNode(
  timerConfig: TimerConfig,
  resetId?: string,
): TimerListItemNode {
  return new TimerListItemNode(timerConfig, resetId);
}
