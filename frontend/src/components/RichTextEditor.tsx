import { useState, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const RichTextEditor = ({ content, onChange, placeholder = "Beginne zu schreiben...", disabled = false }: RichTextEditorProps) => {
  const [editorData, setEditorData] = useState(content);

  useEffect(() => {
    if (content !== editorData) {
      setEditorData(content);
    }
  }, [content, editorData]);

  const handleEditorChange = (_event: any, editor: any) => {
    const data = editor.getData();
    setEditorData(data);
    onChange(data);
  };

  const handleEditorReady = (editor: any) => {
    // Customize editor configuration
    editor.editing.view.change((writer: any) => {
      writer.setStyle('color', '#f3f4f6', editor.editing.view.document.getRoot());
      writer.setStyle('font-size', '16px', editor.editing.view.document.getRoot());
      writer.setStyle('line-height', '1.6', editor.editing.view.document.getRoot());
    });
    
    // Remove any CKEditor branding after editor is ready
    setTimeout(() => {
      const brandingElements = document.querySelectorAll('[class*="powered-by"], [class*="ckeditor"], [class*="branding"], .ck-branding, .ck-powered, .ck-attribution');
      brandingElements.forEach(el => {
        if (el.textContent?.includes('Powered by')) {
          el.remove();
        }
      });
    }, 100);
  };

  return (
    <div className="relative flex-1">
      <style>{`
        .ck-editor__editable {
          background: transparent !important;
          border: none !important;
          color: #f3f4f6 !important;
          font-size: 16px !important;
          line-height: 1.6 !important;
          min-height: 200px !important;
          padding: 0 !important;
        }
        
        .ck-editor__editable:focus {
          box-shadow: none !important;
          border: none !important;
        }
        
        .ck-editor__editable ul {
          list-style-type: disc;
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        
        .ck-editor__editable ol {
          list-style-type: decimal;
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        
        .ck-editor__editable li {
          margin-bottom: 5px;
          color: rgb(243, 244, 246);
        }
        
        .ck-editor__editable ul li::marker {
          color: rgb(107, 114, 128);
        }
        
        .ck-editor__editable ol li::marker {
          color: rgb(107, 114, 128);
        }
        
        .ck-editor__editable a {
          color: #10b981;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .ck-editor__editable a:hover {
          color: #059669;
          text-decoration: underline;
        }
        
        .ck-editor__editable a:visited {
          color: #8b5cf6;
        }
        
        .ck-editor__editable img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
        }
        
        .ck-editor__editable blockquote {
          border-left: 4px solid #10b981;
          padding-left: 16px;
          margin: 16px 0;
          font-style: italic;
          color: rgb(156, 163, 175);
          background-color: rgba(16, 185, 129, 0.05);
          padding: 12px 16px;
          border-radius: 4px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        .ck-editor__editable pre {
          max-width: 100%;
          overflow-x: auto;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          box-sizing: border-box;
        }
        
        .ck-toolbar {
          background: rgba(31, 41, 55, 0.8) !important;
          border: 1px solid rgba(75, 85, 99, 0.3) !important;
          border-radius: 8px 8px 0 0 !important;
        }
        
        .ck-toolbar__separator {
          background: rgba(75, 85, 99, 0.3) !important;
        }
        
        .ck-button {
          color: #f3f4f6 !important;
        }
        
        .ck-button:hover {
          background: rgba(75, 85, 99, 0.3) !important;
        }
        
        .ck-button.ck-on {
          background: rgba(16, 185, 129, 0.2) !important;
          color: #10b981 !important;
        }
        
        .ck-dropdown__panel {
          background: rgba(31, 41, 55, 0.95) !important;
          border: 1px solid rgba(75, 85, 99, 0.3) !important;
        }
        
        .ck-list__item {
          color: #f3f4f6 !important;
        }
        
        .ck-list__item:hover {
          background: rgba(75, 85, 99, 0.3) !important;
        }
        
        /* Hide CKEditor toolbar completely */
        .ck-toolbar {
          display: none !important;
        }
        
        .ck-editor__top {
          display: none !important;
        }
        
        /* Hide CKEditor branding */
        .ck-powered-by {
          display: none !important;
        }
        
        .ck-powered-by-ckeditor {
          display: none !important;
        }
        
        /* Hide any CKEditor branding elements */
        [class*="powered-by"],
        [class*="ckeditor"],
        [class*="branding"],
        .ck-branding,
        .ck-powered,
        .ck-attribution {
          display: none !important;
        }
        
        /* Hide any elements containing "Powered by" text */
        *:has-text("Powered by") {
          display: none !important;
        }
      `}</style>
      
      <CKEditor
        editor={ClassicEditor as any}
        data={editorData}
        onChange={handleEditorChange}
        onReady={handleEditorReady}
        disabled={disabled}
        config={{
          placeholder: placeholder,
          toolbar: {
            items: []
          },
          removePlugins: ['Toolbar', 'ToolbarSeparator', 'PoweredBy']
        }}
      />
    </div>
  );
};

export default RichTextEditor;
