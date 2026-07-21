import { parseHTML } from 'linkedom';

export interface RestoreFlattenedCtaResult {
  content: string;
  restoredCount: number;
}

/**
 * Restores a CTA box that was flattened by TipTap before the CTA node existed
 * in the editor schema. Only this exact sibling sequence is eligible:
 *
 *   h3 + p + p(> a.cta-button)
 *
 * Existing CTA boxes and any other button layout are intentionally left alone.
 */
export function restoreFlattenedCtaBoxes(content: string): RestoreFlattenedCtaResult {
  const { document } = parseHTML(`<!doctype html><html><body>${content}</body></html>`);
  let restoredCount = 0;

  for (const button of document.querySelectorAll<HTMLAnchorElement>('a.cta-button')) {
    if (button.closest('.cta-box')) {
      continue;
    }

    const buttonParagraph = button.parentElement;
    const description = buttonParagraph?.previousElementSibling;
    const heading = description?.previousElementSibling;
    const buttonIsOnlyContent =
      buttonParagraph?.tagName === 'P' &&
      buttonParagraph.children.length === 1 &&
      buttonParagraph.textContent?.trim() === button.textContent?.trim();

    if (
      !buttonIsOnlyContent ||
      description?.tagName !== 'P' ||
      heading?.tagName !== 'H3'
    ) {
      continue;
    }

    const ctaBox = document.createElement('div');
    ctaBox.className = 'cta-box';

    heading.before(ctaBox);
    ctaBox.append(heading, description, button);
    buttonParagraph.remove();
    restoredCount += 1;
  }

  return {
    content: document.body.innerHTML,
    restoredCount,
  };
}
