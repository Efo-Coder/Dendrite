import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const RichTextEditor = ({ content, onChange, placeholder = "Beginne zu schreiben...", disabled = false }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      onChange(htmlContent);
    }
  };

  const handleFocus = () => {
    setIsActive(true);
    if (editorRef.current && editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = '';
    }
  };

  const handleBlur = () => {
    setIsActive(false);
  };

  return (
    <div className="relative flex-1">
      <style>{`
        .rich-text-editor ul {
          list-style-type: disc;
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        .rich-text-editor ol {
          list-style-type: decimal;
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        .rich-text-editor li {
          margin-bottom: 5px;
          color: rgb(243, 244, 246);
        }
        .rich-text-editor ul li::marker {
          color: rgb(107, 114, 128);
        }
        .rich-text-editor ol li::marker {
          color: rgb(107, 114, 128);
        }
        .rich-text-editor a {
          color: #10b981;
          text-decoration: underline;
          cursor: pointer;
        }
        .rich-text-editor a:hover {
          color: #059669;
          text-decoration: underline;
        }
        .rich-text-editor a:visited {
          color: #8b5cf6;
        }
        .rich-text-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
        }
      `}</style>
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={clsx(
            'rich-text-editor w-full h-full bg-transparent border-none outline-none',
            'text-dark-text-primary text-base md:text-lg leading-relaxed',
            'focus:outline-none',
            'break-words',
            isActive && 'ring-0',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          maxWidth: '100%',
          minHeight: '100%'
        }}
          suppressContentEditableWarning={true}
        />
        {!content && !isActive && (
          <div className="absolute top-0 left-0 text-dark-text-muted pointer-events-none">
            {placeholder}
          </div>
        )}
    </div>
  );
};

export default RichTextEditor;
