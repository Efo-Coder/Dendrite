import { useEffect, useState, type RefObject } from 'react';
import type Lenis from 'lenis';
import { TableOfContentsPlugin, type TableOfContentsEntry } from '@lexical/react/LexicalTableOfContentsPlugin';
import type { LexicalEditor } from 'lexical';
import clsx from 'clsx';

interface TableOfContentsProps {
  // The editor's scroll container — used to measure heading offsets for the
  // scroll-spy and as the scroll target on click.
  scrollRef: RefObject<HTMLElement | null>;
  // Live Lenis instance (null under reduced-motion) for smooth programmatic jumps.
  lenisRef: RefObject<Lenis | null>;
}

// Below this many headings an outline adds no value — the column collapses to 0.
const MIN_HEADINGS = 2;
// A click lands the target heading this far below the scroller's top (clear of the
// top fade).
const JUMP_OFFSET = -56;
// The spy marks a heading current once its top crosses this line. It sits just below
// the landing position so jumping to a heading activates that heading — the gap to
// the line must stay well under the distance between two adjacent headings, or the
// next heading would win.
const SPY_THRESHOLD = 64;

// Indent each level relative to h1 so the outline reads as a hierarchy.
const INDENT_BY_TAG: Record<string, string> = {
  h1: 'pl-4',
  h2: 'pl-7',
  h3: 'pl-10',
  h4: 'pl-13',
  h5: 'pl-16',
  h6: 'pl-19',
};

interface TocListProps extends TableOfContentsProps {
  entries: TableOfContentsEntry[];
  editor: LexicalEditor;
}

const TocList = ({ entries, editor, scrollRef, lenisRef }: TocListProps) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Scroll-spy: the active section is the last heading whose top has crossed the
  // threshold below the scroller's top edge.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const update = () => {
      // Trailing headings can't scroll up to the threshold once the container hits
      // its bottom, so anchor the last heading as active there.
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        setActiveKey(entries[entries.length - 1][0]);
        return;
      }
      const scTop = scroller.getBoundingClientRect().top;
      let current = entries[0][0];
      for (const [key] of entries) {
        const el = editor.getElementByKey(key);
        if (!el) continue;
        if (el.getBoundingClientRect().top - scTop <= SPY_THRESHOLD) current = key;
        else break;
      }
      setActiveKey(current);
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    return () => scroller.removeEventListener('scroll', update);
  }, [entries, editor, scrollRef]);

  const jumpTo = (key: string) => {
    const el = editor.getElementByKey(key);
    const scroller = scrollRef.current;
    if (!el || !scroller) return;
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(el, { offset: JUMP_OFFSET });
    } else {
      const top =
        el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop + JUMP_OFFSET;
      scroller.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <nav className="w-48 shrink-0 mr-8 px-2 select-none">
      <p className="mb-3 pl-4 font-(--mono) text-[12px] uppercase tracking-[0.16em] text-(--ink-dim)">
        On this page
      </p>
      <ul className="relative max-h-[70vh] space-y-0.5 overflow-y-auto before:absolute before:top-1 before:bottom-1 before:left-0 before:rounded-full before:w-0.5 before:bg-(--line-soft) before:content-['']">
        {entries.map(([key, text, tag]) => {
          const isActive = key === activeKey;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => jumpTo(key)}
                className={clsx(
                  'relative block w-full truncate py-1 pr-2 text-left text-sm leading-snug transition-colors',
                  INDENT_BY_TAG[tag] ?? 'pl-4',
                  isActive ? 'text-(--ink)' : 'text-(--ink-mid) hover:text-(--ink)',
                  // Active marker overlays the list's hairline with an accent bar.
                  isActive &&
                    "before:absolute before:left-0 before:top-1 before:bottom-1 before:rounded-full before:w-0.5 before:bg-(--accent) before:content-['']",
                )}
                title={text || 'Untitled'}
              >
                {text || 'Untitled'}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const TableOfContents = ({ scrollRef, lenisRef }: TableOfContentsProps) => (
  <TableOfContentsPlugin>
    {(entries, editor) =>
      entries.length >= MIN_HEADINGS ? (
        <TocList entries={entries} editor={editor} scrollRef={scrollRef} lenisRef={lenisRef} />
      ) : (
        <></>
      )
    }
  </TableOfContentsPlugin>
);

export default TableOfContents;
