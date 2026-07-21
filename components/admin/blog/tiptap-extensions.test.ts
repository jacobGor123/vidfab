import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { restoreFlattenedCtaBoxes } from '@/lib/blog/restore-flattened-cta';

const { document } = parseHTML('<!doctype html><html><body></body></html>');

class TestDOMParser {
  parseFromString(value: string) {
    return parseHTML(`<!doctype html><html>${value}</html>`).document;
  }
}

Object.assign(globalThis, {
  window: { DOMParser: TestDOMParser, document },
  document,
});

Object.defineProperty(document, 'implementation', {
  value: {
    createHTMLDocument: () => parseHTML('<!doctype html><html><body></body></html>').document,
  },
});

test('preserves blog containers and CTA markup through TipTap HTML round trips', async () => {
  const [{ generateHTML, generateJSON }, { createBlogEditorExtensions }] = await Promise.all([
    import('@tiptap/core'),
    import('./tiptap-extensions'),
  ]);
  const extensions = createBlogEditorExtensions('Write your post');
  const source = `
    <article>
      <section id="intro-section">
        <h2 id="what-is-ai-video">What is an AI video generator?</h2>
        <p>A short introduction.</p>
        <div class="cta-box">
          <h3>Try Story-to-Video</h3>
          <p>Plan the shots before you generate.</p>
          <a href="/studio/video-agent-beta" class="cta-button">Start free →</a>
        </div>
      </section>
    </article>
  `;

  const firstPass = generateHTML(generateJSON(source, extensions), extensions);
  const secondPass = generateHTML(generateJSON(firstPass, extensions), extensions);

  for (const html of [firstPass, secondPass]) {
    assert.match(html, /<article>/);
    assert.match(html, /<section id="intro-section">/);
    assert.match(html, /id="what-is-ai-video"/);
    assert.match(html, /<div class="cta-box">/);
    assert.match(html, /class="[^"]*cta-button[^"]*"/);
    assert.match(html, /Start free/);
  }
});

test('restores only a flattened CTA sibling sequence', () => {
  const flattened = `
    <h3 class="tiptap-heading">Try Story-to-Video</h3>
    <p>Plan the shots before you generate.</p>
    <p><a class="text-blue-600 underline cta-button" href="/studio/video-agent-beta">Start free →</a></p>
    <p>Unrelated content.</p>
  `;

  const { content, restoredCount } = restoreFlattenedCtaBoxes(flattened);

  assert.equal(restoredCount, 1);
  assert.match(content, /<div class="cta-box">/);
  assert.match(content, /<a class="text-blue-600 underline cta-button" href="\/studio\/video-agent-beta">Start free →<\/a>/);
  assert.match(content, /<p>Unrelated content.<\/p>/);
});
