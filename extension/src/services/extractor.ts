// ============================================================
// Webpage Content Extractor
// Clean, reduce, and deduplicate page data for AI analysis
// ============================================================

import type { PageData } from '../types';

export function extractPageData(): PageData {
  const url = window.location.href;
  const title = document.title || '';

  // Meta description
  const metaDescTag = document.querySelector('meta[name="description"]') ||
    document.querySelector('meta[property="og:description"]');
  const meta_description = metaDescTag ? (metaDescTag.getAttribute('content') || '') : '';

  // Headings (H1 to H3)
  const headings: string[] = [];
  document.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const text = (heading.textContent || '').trim().replace(/\s+/g, ' ');
    if (text && text.length > 3 && !headings.includes(text)) {
      headings.push(text);
    }
  });

  // Extract main text content (cleaned, deduplicated, max ~5000 chars)
  // Ignore scripts, styles, nav, footer, iframes, svgs, noscripts
  const clone = document.body ? document.body.cloneNode(true) as HTMLElement : null;
  let cleanedContent = '';

  if (clone) {
    const elementsToRemove = clone.querySelectorAll(
      'script, style, noscript, iframe, svg, canvas, nav, footer, header, symbol, form, [aria-hidden="true"]'
    );
    elementsToRemove.forEach((el) => el.remove());

    const walker = document.createTreeWalker(
      clone,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const display = window.getComputedStyle(parent).display;
          const visibility = window.getComputedStyle(parent).visibility;
          if (display === 'none' || visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const textPieces: string[] = [];
    let currentNode = walker.nextNode();
    let totalLength = 0;

    while (currentNode && totalLength < 6000) {
      const text = (currentNode.nodeValue || '').trim().replace(/\s+/g, ' ');
      if (text.length > 20 && !textPieces.includes(text)) {
        textPieces.push(text);
        totalLength += text.length;
      }
      currentNode = walker.nextNode();
    }

    cleanedContent = textPieces.join('\n').slice(0, 5000);
  }

  // Links: meaningful internal & nav links
  const links: string[] = [];
  document.querySelectorAll('a[href]').forEach((a) => {
    try {
      const href = a.getAttribute('href');
      const text = (a.textContent || '').trim();
      if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
        const fullUrl = new URL(href, window.location.origin).href;
        if (!links.includes(fullUrl) && links.length < 25) {
          links.push(fullUrl);
        }
      }
    } catch {
      // ignore invalid URL
    }
  });

  // OpenGraph tags
  const opengraph: Record<string, string> = {};
  document.querySelectorAll('meta[property^="og:"]').forEach((meta) => {
    const property = meta.getAttribute('property');
    const content = meta.getAttribute('content');
    if (property && content) {
      opengraph[property.replace('og:', '')] = content;
    }
  });

  // JSON-LD structured data
  const json_ld: Record<string, unknown>[] = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      if (script.textContent) {
        const parsed = JSON.parse(script.textContent);
        if (parsed) {
          json_ld.push(parsed);
        }
      }
    } catch {
      // ignore invalid json
    }
  });

  // Contact info (emails, phone numbers)
  const emails: string[] = [];
  const phones: string[] = [];
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const phoneRegex = /(\+?[0-9]{1,3}[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g;

  // Search mailto links
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (email && !emails.includes(email)) {
      emails.push(email);
    }
  });

  // Search tel links
  document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const tel = href.replace(/^tel:/i, '').trim();
    if (tel && !phones.includes(tel)) {
      phones.push(tel);
    }
  });

  // Text matches for emails in page text
  const textMatches = (document.body?.innerText || '').slice(0, 15000);
  const foundEmails = textMatches.match(emailRegex) || [];
  foundEmails.forEach((email) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!emails.includes(cleanEmail) && !cleanEmail.endsWith('.png') && !cleanEmail.endsWith('.jpg')) {
      emails.push(cleanEmail);
    }
  });

  // Technology indicators
  const technologies: string[] = [];
  const generatorMeta = document.querySelector('meta[name="generator"]');
  if (generatorMeta) {
    const gen = generatorMeta.getAttribute('content');
    if (gen) technologies.push(gen);
  }

  // Check common scripts & libraries
  document.querySelectorAll('script[src]').forEach((script) => {
    const src = (script.getAttribute('src') || '').toLowerCase();
    if (src.includes('google-analytics') || src.includes('gtag')) technologies.push('Google Analytics');
    if (src.includes('googletagmanager')) technologies.push('Google Tag Manager');
    if (src.includes('hubspot')) technologies.push('HubSpot');
    if (src.includes('intercom')) technologies.push('Intercom');
    if (src.includes('segment')) technologies.push('Segment');
    if (src.includes('mixpanel')) technologies.push('Mixpanel');
    if (src.includes('hotjar')) technologies.push('Hotjar');
    if (src.includes('stripe')) technologies.push('Stripe');
    if (src.includes('shopify')) technologies.push('Shopify');
    if (src.includes('wp-content')) technologies.push('WordPress');
    if (src.includes('webflow')) technologies.push('Webflow');
  });

  // Deduplicate technologies
  const uniqueTech = Array.from(new Set(technologies));

  return {
    url,
    title,
    meta_description,
    headings: headings.slice(0, 15),
    content: cleanedContent,
    links: links.slice(0, 20),
    opengraph,
    json_ld: json_ld.slice(0, 5),
    contact_info: {
      emails: emails.slice(0, 5),
      phones: phones.slice(0, 5),
    },
    technologies: uniqueTech,
  };
}
