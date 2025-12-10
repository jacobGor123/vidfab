/**
 * Blog 表单组件
 * 用于创建和编辑博客文章
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TiptapEditor from './tiptap-editor';
import type { BlogPost } from '@/models/blog';

interface BlogFormProps {
  initialData?: Partial<BlogPost>;
  isEdit?: boolean;
}

export default function BlogForm({ initialData, isEdit = false }: BlogFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    featured_image_url: initialData?.featured_image_url || '',
    category: initialData?.category || '',
    tags: initialData?.tags?.join(', ') || '',
    meta_title: initialData?.meta_title || '',
    meta_description: initialData?.meta_description || '',
    keywords: initialData?.keywords?.join(', ') || '',
    status: initialData?.status || 'draft',
    scheduled_at: initialData?.scheduled_at
      ? new Date(initialData.scheduled_at).toISOString().slice(0, 16)
      : '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags
          ? formData.tags.split(',').map((tag) => tag.trim())
          : [],
        keywords: formData.keywords
          ? formData.keywords.split(',').map((kw) => kw.trim())
          : [],
        scheduled_at: formData.scheduled_at || null,
      };

      const url = isEdit
        ? `/api/admin/blog/${initialData?.id}`
        : '/api/admin/blog';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        alert(isEdit ? '文章更新成功!' : '文章创建成功!');
        router.push('/admin/blog');
        router.refresh();
      } else {
        alert(`操作失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('操作失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基础信息 */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">基础信息</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="文章标题"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug (URL)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="自动生成或手动输入"
            />
            <p className="text-xs text-gray-500 mt-1">
              留空则自动从标题生成
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分类
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">选择分类</option>
              <option value="tutorial">教程</option>
              <option value="announcement">公告</option>
              <option value="guide">指南</option>
              <option value="tips">技巧</option>
              <option value="news">新闻</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            摘要
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) =>
              setFormData({ ...formData, excerpt: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            placeholder="简短描述文章内容..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            特色图片 URL
          </label>
          <input
            type="url"
            value={formData.featured_image_url}
            onChange={(e) =>
              setFormData({ ...formData, featured_image_url: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标签 (逗号分隔)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) =>
              setFormData({ ...formData, tags: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            placeholder="AI, video, tutorial"
          />
        </div>
      </div>

      {/* 文章内容 */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          文章内容 <span className="text-red-500">*</span>
        </h2>
        <TiptapEditor
          content={formData.content}
          onChange={(html) => setFormData({ ...formData, content: html })}
        />
      </div>

      {/* SEO 优化 */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">SEO 优化</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SEO 标题
          </label>
          <input
            type="text"
            value={formData.meta_title}
            onChange={(e) =>
              setFormData({ ...formData, meta_title: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            placeholder="留空则使用文章标题"
            maxLength={60}
          />
          <p className="text-xs text-gray-500 mt-1">
            建议 50-60 字符 (当前: {formData.meta_title.length})
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SEO 描述
          </label>
          <textarea
            value={formData.meta_description}
            onChange={(e) =>
              setFormData({ ...formData, meta_description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            placeholder="留空则使用摘要"
            maxLength={160}
          />
          <p className="text-xs text-gray-500 mt-1">
            建议 150-160 字符 (当前: {formData.meta_description.length})
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            关键词 (逗号分隔)
          </label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) =>
              setFormData({ ...formData, keywords: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            placeholder="ai video, video generation, tutorial"
          />
        </div>
      </div>

      {/* 发布设置 */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">发布设置</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              状态
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="draft">草稿</option>
              <option value="scheduled">定时发布</option>
              <option value="published">立即发布</option>
            </select>
          </div>

          {formData.status === 'scheduled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                定时发布时间
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_at: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? '保存中...' : isEdit ? '更新文章' : '创建文章'}
        </button>
      </div>
    </form>
  );
}
