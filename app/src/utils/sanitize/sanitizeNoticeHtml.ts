import createDOMPurify, { type DOMPurify } from 'dompurify';

const ALLOWED_TAGS = ['a', 'b', 'i', 'p', 'br', 'ul', 'li'];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

const ALLOWED_HREF_PROTOCOLS = ['https:', 'mailto:'];

let purifier: DOMPurify | null = null;

function getPurifier(): DOMPurify | null {
  if (typeof window === 'undefined') return null;
  if (purifier) return purifier;

  const instance = createDOMPurify(window);
  instance.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeType !== 1) return;
    const el = node;

    if (el.tagName === 'A') {
      const href = el.getAttribute('href');
      if (href) {
        try {
          const parsed = new URL(href, window.location.href);
          if (!ALLOWED_HREF_PROTOCOLS.includes(parsed.protocol)) {
            el.removeAttribute('href');
          }
        } catch {
          el.removeAttribute('href');
        }
      }
      const finalHref = el.getAttribute('href');
      const isExternal = finalHref?.startsWith('https:') ?? false;
      if (isExternal) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      } else {
        el.removeAttribute('target');
        el.removeAttribute('rel');
      }
    }
  });

  purifier = instance;
  return instance;
}

export function sanitizeNoticeHtml(input: string): string {
  if (!input) return '';
  const instance = getPurifier();
  if (!instance) return '';
  return instance.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style'],
    FORBID_TAGS: [
      'style',
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'svg',
      'math',
      'noscript',
      'template',
    ],
    FORBID_CONTENTS: [
      'style',
      'script',
      'noscript',
      'iframe',
      'svg',
      'math',
      'template',
    ],
  });
}
