/**
 * Tiptap 富文本编辑器组件
 * 支持 HTML 内容编辑、图片上传、链接等功能
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Heading from '@tiptap/extension-heading';
import { useCallback, useState } from 'react';
import { format as prettierFormat } from 'prettier/standalone';
import parserHtml from 'prettier/plugins/html';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  Image as ImageIcon,
  Code,
  Quote,
  Undo,
  Redo,
  FileCode,
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({
  content,
  onChange,
  placeholder = '开始编写你的博客文章...',
}: TiptapEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false, // 使用自定义的 Heading
      }),
      Heading.configure({
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: 'tiptap-heading',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] max-w-none px-4 py-3 !text-gray-900 prose-headings:!text-gray-900 prose-p:!text-gray-900 prose-li:!text-gray-900 prose-strong:!text-gray-900 prose-code:!text-gray-900 prose-a:!text-blue-600',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('输入链接地址:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('输入图片 URL:');

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;

    if (isHtmlMode) {
      // 从 HTML 模式切换回可视化模式
      editor.commands.setContent(htmlContent);
      onChange(htmlContent);
      setIsHtmlMode(false);
    } else {
      // 从可视化模式切换到 HTML 模式
      const html = editor.getHTML();
      setHtmlContent(html);
      setIsHtmlMode(true);
    }
  }, [editor, isHtmlMode, htmlContent, onChange]);

  const formatHtmlContent = useCallback(async () => {
    try {
      const formatted = await prettierFormat(htmlContent, {
        parser: 'html',
        plugins: [parserHtml],
        printWidth: 80,
        tabWidth: 2,
        htmlWhitespaceSensitivity: 'ignore',
      });

      setHtmlContent(formatted);
      onChange(formatted);
    } catch (error) {
      console.error('HTML format error:', error);
      alert('HTML 格式化失败，请检查标签是否正确闭合');
    }
  }, [htmlContent, onChange]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <style jsx global>{`
        .tiptap-editor-content .ProseMirror {
          color: #111827 !important;
        }
        .tiptap-editor-content .ProseMirror * {
          color: #111827 !important;
        }
        .tiptap-editor-content .ProseMirror p {
          color: #111827 !important;
        }
        .tiptap-editor-content .ProseMirror h1,
        .tiptap-editor-content .ProseMirror h2,
        .tiptap-editor-content .ProseMirror h3 {
          color: #111827 !important;
        }
        .tiptap-editor-content .ProseMirror li {
          color: #111827 !important;
        }
        .tiptap-editor-content .ProseMirror strong {
          color: #111827 !important;
        }
        .tiptap-editor-content .ProseMirror code {
          color: #111827 !important;
        }
        .tiptap-editor-content .ProseMirror a {
          color: #2563eb !important;
        }
      `}</style>
      {/* 工具栏 */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1 text-gray-900">
        {/* 标题 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 text-gray-900 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''
          }`}
          title="标题 1"
        >
          <Heading1 className="w-4 h-4 text-gray-900" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
          }`}
          title="标题 2"
        >
          <Heading2 className="w-4 h-4 text-gray-900" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''
          }`}
          title="标题 3"
        >
          <Heading3 className="w-4 h-4 text-gray-900" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 文本格式 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-gray-300' : ''
          }`}
          title="粗体"
        >
          <Bold className="w-4 h-4 text-gray-900" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-gray-300' : ''
          }`}
          title="斜体"
        >
          <Italic className="w-4 h-4 text-gray-900" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('code') ? 'bg-gray-300' : ''
          }`}
          title="代码"
        >
          <Code className="w-4 h-4 text-gray-900" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 列表 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-gray-300' : ''
          }`}
          title="无序列表"
        >
          <List className="w-4 h-4 text-gray-900" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-gray-300' : ''
          }`}
          title="有序列表"
        >
          <ListOrdered className="w-4 h-4 text-gray-900" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('blockquote') ? 'bg-gray-300' : ''
          }`}
          title="引用"
        >
          <Quote className="w-4 h-4 text-gray-900" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 插入 */}
        <button
          type="button"
          onClick={setLink}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('link') ? 'bg-gray-300' : ''
          }`}
          title="插入链接"
        >
          <Link2 className="w-4 h-4 text-gray-900" />
        </button>
        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded hover:bg-gray-200"
          title="插入图片"
        >
          <ImageIcon className="w-4 h-4 text-gray-900" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* HTML 源码 */}
        <button
          type="button"
          onClick={toggleHtmlMode}
          className={`p-2 rounded hover:bg-gray-200 ${
            isHtmlMode ? 'bg-gray-300' : ''
          }`}
          title="HTML 源码"
        >
          <FileCode className="w-4 h-4 text-gray-900" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 撤销/重做 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="撤销"
        >
          <Undo className="w-4 h-4 text-gray-900" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="重做"
        >
          <Redo className="w-4 h-4 text-gray-900" />
        </button>
      </div>

      {/* 编辑器内容 */}
      <div className="bg-white tiptap-editor-content">
        {isHtmlMode ? (
          <div className="flex flex-col">
            <div className="flex justify-end border-b border-gray-200 px-3 py-2 bg-gray-50">
              <button
                type="button"
                onClick={formatHtmlContent}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 transition"
                title="格式化 HTML"
              >
                格式化
              </button>
            </div>
            <textarea
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                onChange(e.target.value);
              }}
              className="w-full min-h-[400px] p-4 font-mono text-sm text-gray-900 bg-white border-0 focus:outline-none resize-none"
              placeholder="HTML 源码..."
            />
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      {/* 字数统计 */}
      <div className="bg-gray-50 border-t border-gray-300 px-4 py-2 text-xs !text-gray-600 flex justify-between">
        <span>
          {editor.storage.characterCount?.characters() || 0} 字符 ·{' '}
          {editor.storage.characterCount?.words() || 0} 单词
        </span>
        <span>
          预计阅读时间:{' '}
          {Math.ceil((editor.storage.characterCount?.words() || 0) / 200)} 分钟
        </span>
      </div>
    </div>
  );
}
