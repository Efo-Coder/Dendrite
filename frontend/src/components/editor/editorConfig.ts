import { LexicalNode, $isTextNode } from 'lexical';

// Custom span importer: Lexical's default applyTextFormatFromStyle ignores color,
// background-color, font-family, font-size. This converter (priority 1) restores them.
export const htmlImport = {
  span: (domNode: HTMLElement) => {
    const style = domNode.style;
    const color = style.color;
    const backgroundColor = style.backgroundColor;
    const fontFamily = style.fontFamily;
    const fontSize = style.fontSize;
    if (!color && !backgroundColor && !fontFamily && !fontSize) return null;

    return {
      conversion: (el: HTMLElement) => {
        const s = el.style;
        const fontWeight = s.fontWeight;
        const textDeco = s.textDecoration ? s.textDecoration.split(' ') : [];
        const hasBold = fontWeight === '700' || fontWeight === 'bold';
        const hasStrike = textDeco.includes('line-through');
        const hasItalic = s.fontStyle === 'italic';
        const hasUnder = textDeco.includes('underline');
        const vAlign = s.verticalAlign;
        const parts: string[] = [];
        if (s.color) parts.push(`color: ${s.color}`);
        if (s.backgroundColor) parts.push(`background-color: ${s.backgroundColor}`);
        if (s.fontFamily) parts.push(`font-family: ${s.fontFamily}`);
        if (s.fontSize) parts.push(`font-size: ${s.fontSize}`);
        const inlineStyle = parts.join('; ');
        return {
          node: null,
          forChild: (lexicalNode: LexicalNode) => {
            if (!$isTextNode(lexicalNode)) return lexicalNode;
            if (hasBold && !lexicalNode.hasFormat('bold')) lexicalNode.toggleFormat('bold');
            if (hasStrike && !lexicalNode.hasFormat('strikethrough')) lexicalNode.toggleFormat('strikethrough');
            if (hasItalic && !lexicalNode.hasFormat('italic')) lexicalNode.toggleFormat('italic');
            if (hasUnder && !lexicalNode.hasFormat('underline')) lexicalNode.toggleFormat('underline');
            if (vAlign === 'sub' && !lexicalNode.hasFormat('subscript')) lexicalNode.toggleFormat('subscript');
            if (vAlign === 'super' && !lexicalNode.hasFormat('superscript')) lexicalNode.toggleFormat('superscript');
            if (inlineStyle) {
              const cur = lexicalNode.getStyle();
              lexicalNode.setStyle(cur ? `${cur}; ${inlineStyle}` : inlineStyle);
            }
            return lexicalNode;
          },
        };
      },
      priority: 1 as const,
    };
  },
};

export const editorTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
    listitemChecked: 'editor-listitem-checked',
    listitemUnchecked: 'editor-listitem-unchecked',
  },
  hr: 'editor-hr',
  image: 'editor-image',
  link: 'editor-link',
  table: 'editor-table',
  tableRow: 'editor-table-row',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    overflowed: 'editor-text-overflowed',
    hashtag: 'editor-text-hashtag',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};

// Matches http(s):// or www. URLs with a TLD of 2-13 letters (no digits → filters garbage like .abc123)
const URL_REGEX = /((https?:\/\/(www\.)?)|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,13}(\/[-a-zA-Z0-9()@:%_+.~#?&/=]*)?/i;

export const URL_MATCHERS = [
  (text: string) => {
    const match = URL_REGEX.exec(text);
    if (!match) return null;
    const raw = match[0].replace(/[.,;!?]+$/, '');
    return {
      index: match.index,
      length: raw.length,
      text: raw,
      url: raw.startsWith('http') ? raw : `https://${raw}`,
    };
  },
];

export function onError(error: Error) {
  console.error(error);
}
