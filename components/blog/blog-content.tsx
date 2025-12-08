/**
 * Blog Content Component
 * 博客内容渲染组件 - 使用 Prose 样式渲染 HTML 内容
 */

'use client';

import { useEffect } from 'react';

interface BlogContentProps {
  content: string;
}

export function BlogContent({ content }: BlogContentProps) {
  useEffect(() => {
    // Add syntax highlighting for code blocks if needed
    // You can integrate Prism.js or highlight.js here
  }, [content]);

  return (
    <div
      className="prose prose-invert prose-lg max-w-none
        prose-headings:font-heading prose-headings:font-bold prose-headings:text-white
        prose-h1:text-4xl prose-h1:mb-6
        prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
        prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
        prose-a:text-brand-purple-DEFAULT prose-a:no-underline hover:prose-a:underline
        prose-strong:text-white prose-strong:font-semibold
        prose-code:text-brand-pink-DEFAULT prose-code:bg-brand-gray-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:bg-brand-gray-800 prose-pre:border prose-pre:border-brand-gray-700 prose-pre:rounded-lg prose-pre:p-4
        prose-ul:text-gray-300 prose-ul:list-disc prose-ul:pl-6
        prose-ol:text-gray-300 prose-ol:list-decimal prose-ol:pl-6
        prose-li:my-2
        prose-blockquote:border-l-4 prose-blockquote:border-brand-purple-DEFAULT prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400
        prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8
        prose-hr:border-brand-gray-700 prose-hr:my-8
        prose-table:border-collapse prose-table:w-full
        prose-th:bg-brand-gray-800 prose-th:border prose-th:border-brand-gray-700 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:text-white
        prose-td:border prose-td:border-brand-gray-700 prose-td:px-4 prose-td:py-2 prose-td:text-gray-300"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
