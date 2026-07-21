/**
 * Blog-specific TipTap schema extensions.
 *
 * Blog posts are stored as HTML and can contain semantic section wrappers plus
 * styled callouts. Those elements must exist in the editor schema, otherwise
 * TipTap removes them whenever it serializes an edited article.
 */

import { mergeAttributes, Node, type Extensions } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';

const CALLOUT_CLASSES = ['cta-box', 'info-box', 'warning-box'] as const;

const BlogHeading = Heading.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) =>
          attributes.id ? { id: attributes.id } : {},
      },
    };
  },
});

const BlogArticle = Node.create({
  name: 'blogArticle',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'article' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['article', mergeAttributes(HTMLAttributes), 0];
  },
});

const BlogSection = Node.create({
  name: 'blogSection',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) =>
          attributes.id ? { id: attributes.id } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes), 0];
  },
});

const BlogCallout = Node.create({
  name: 'blogCallout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) =>
          CALLOUT_CLASSES.find((className) =>
            element.classList.contains(className)
          ) ?? null,
        renderHTML: (attributes) =>
          attributes.class ? { class: attributes.class } : {},
      },
    };
  },

  parseHTML() {
    return CALLOUT_CLASSES.map((className) => ({
      tag: `div.${className}`,
    }));
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
});

export function createBlogEditorExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: false,
      // TipTap 3's StarterKit already bundles Link. Keep it disabled here so
      // the explicit configuration below is the single source of truth.
      link: false,
    }),
    BlogHeading.configure({
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
    BlogArticle,
    BlogSection,
    BlogCallout,
  ];
}
