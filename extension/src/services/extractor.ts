// ============================================================
// Webpage Content Extractor
// Clean, reduce, and deduplicate page data for AI analysis
// Supports standard websites, SaaS portals, and LinkedIn profiles
// ============================================================

import type { PageData } from '../types';

export function extractPageData(): PageData {
  const url = window.location.href;
  const title = document.title || '';

  // Meta description
  const metaDescTag = document.querySelector('meta[name="description"]') ||
    document.querySelector('meta[property="og:description"]');
  const meta_description = metaDescTag ? (metaDescTag.getAttribute('content') || '') : '';

  // Check if current page is LinkedIn
  const isLinkedIn = url.includes('linkedin.com');

  if (isLinkedIn && url.includes('/in/')) {
    return extractLinkedInProfile(url, title, meta_description);
  }

  // Headings (H1 to H3)
  const headings: string[] = [];
  document.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const text = (heading.textContent || '').trim().replace(/\s+/g, ' ');
    if (text && text.length > 2 && !headings.includes(text)) {
      headings.push(text);
    }
  });

  // Extract clean visible content from document.body
  let cleanedContent = '';
  if (document.body) {
    // Clone body to avoid mutating active page
    const clone = document.body.cloneNode(true) as HTMLElement;
    const elementsToRemove = clone.querySelectorAll(
      'script, style, noscript, iframe, svg, canvas, nav, footer, symbol, [hidden]'
    );
    elementsToRemove.forEach((el) => el.remove());

    const rawText = clone.innerText || clone.textContent || '';
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    // Deduplicate consecutive lines
    const deduplicated: string[] = [];
    lines.forEach((line) => {
      if (!deduplicated.includes(line)) {
        deduplicated.push(line);
      }
    });

    cleanedContent = deduplicated.join('\n').slice(0, 6000);
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

  // Data minimization: avoid scraping third-party personal emails or bloated JSON-LD blobs
  const emails: string[] = [];
  const phones: string[] = [];

  // Technologies
  const technologies = extractTechnologies();

  return {
    url,
    title,
    meta_description,
    headings: headings.slice(0, 15),
    content: cleanedContent,
    links: links.slice(0, 10),
    opengraph,
    json_ld: [],
    contact_info: {
      emails,
      phones,
    },
    technologies,
  };
}

/**
 * Dedicated LinkedIn Profile Extractor
 */
function extractLinkedInProfile(url: string, title: string, meta_description: string): PageData {
  // Extract Name (from h1 or profile headline)
  const h1 = document.querySelector('h1')?.textContent?.trim() || '';
  const titleClean = title.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
  const nameFromTitle = titleClean.split('-')[0]?.trim() || '';
  const name = h1 || nameFromTitle || 'LinkedIn Prospect';

  // Extract Headline (Job title & company)
  const headlineEl = document.querySelector('.text-body-medium.break-words') ||
    document.querySelector('.pv-text-details__left-panel div') ||
    document.querySelector('.top-card-layout__headline');
  const headline = headlineEl?.textContent?.trim().replace(/\s+/g, ' ') || '';

  // Extract Location
  const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words') ||
    document.querySelector('.top-card-layout__first-subline');
  const location = locationEl?.textContent?.trim().replace(/\s+/g, ' ') || '';

  // Extract Current Company from headline or experience
  let company = '';
  if (headline.includes(' at ')) {
    company = headline.split(' at ').pop()?.trim() || '';
  } else if (headline.includes(' @ ')) {
    company = headline.split(' @ ').pop()?.trim() || '';
  }

  // Extract About section
  const aboutEl = document.querySelector('#about ~ .display-flex .inline-show-more-text') ||
    document.querySelector('section[data-section="summary"] .core-section-container__content');
  const aboutText = aboutEl?.textContent?.trim().replace(/\s+/g, ' ') || '';

  // Extract Experience items
  const experienceItems: string[] = [];
  document.querySelectorAll('#experience ~ .pvs-list__outer-container li').forEach((li) => {
    const text = (li.textContent || '').trim().replace(/\s+/g, ' ');
    if (text && text.length > 10 && !experienceItems.includes(text)) {
      experienceItems.push(text);
    }
  });

  // Construct structured text content for AI intelligence
  const contentParts = [
    `=== LINKEDIN EXECUTIVE PROSPECT PROFILE ===`,
    `PROSPECT NAME: ${name}`,
    `CURRENT ROLE / HEADLINE: ${headline}`,
    `COMPANY / ORGANIZATION: ${company || 'Identified via Experience'}`,
    `LOCATION: ${location}`,
    aboutText ? `ABOUT / SUMMARY:\n${aboutText}` : '',
    experienceItems.length ? `EXPERIENCE & ROLES:\n${experienceItems.slice(0, 5).join('\n')}` : '',
    `PAGE TITLE: ${title}`,
    `PAGE URL: ${url}`,
  ].filter(Boolean);

  const formattedContent = contentParts.join('\n\n');

  return {
    url,
    title: `${name} - ${headline} | LeadPing AI`,
    meta_description: meta_description || headline,
    headings: [name, headline, location].filter(Boolean),
    content: formattedContent,
    links: [],
    opengraph: {},
    json_ld: [],
    contact_info: { emails: [], phones: [] },
    technologies: ['LinkedIn Enterprise Profile'],
    prospect: {
      name,
      title: headline,
      company: company || 'Executive Leadership',
      location,
    },
  };
}

function extractTechnologies(): string[] {
  const technologies: string[] = [];
  const generatorMeta = document.querySelector('meta[name="generator"]');
  if (generatorMeta) {
    const gen = generatorMeta.getAttribute('content');
    if (gen) technologies.push(gen);
  }

  document.querySelectorAll('script[src]').forEach((script) => {
    const src = (script.getAttribute('src') || '').toLowerCase();
    if (src.includes('google-analytics') || src.includes('gtag')) technologies.push('Google Analytics');
    if (src.includes('googletagmanager')) technologies.push('Google Tag Manager');
    if (src.includes('hubspot')) technologies.push('HubSpot');
    if (src.includes('intercom')) technologies.push('Intercom');
    if (src.includes('segment')) technologies.push('Segment');
    if (src.includes('stripe')) technologies.push('Stripe');
    if (src.includes('shopify')) technologies.push('Shopify');
    if (src.includes('wp-content')) technologies.push('WordPress');
    if (src.includes('webflow')) technologies.push('Webflow');
  });

  return Array.from(new Set(technologies));
}
