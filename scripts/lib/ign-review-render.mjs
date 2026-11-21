import {decodeHtml} from './csv.mjs';

function htmlToMarkdown(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?aside[^>]*>/gi, '\n\n')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<section[^>]*data-transform="quoteBox"[^>]*>([\s\S]*?)<\/section>/gi, '\n\n> $1\n\n')
    .replace(/<section[^>]*data-transform="(?:mobile-ad-break|ignvideo|poll|slideshow)"[^>]*>[\s\S]*?<\/section>/gi, '\n\n')
    .replace(/<\/?section[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<blockquote[^>]*>/gi, '\n\n> ')
    .replace(/<\/blockquote>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');

  return decodeHtml(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function yamlString(value) {
  return `"${String(value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export function renderIgnMarkdown(row, page, sourceUrl) {
  const review = page.review ?? {};
  const author = page.contributors?.[0]?.name ?? '';
  const published = (page.publishDate ?? '').slice(0, 10);
  const isPlaceholder = (url) => /\/ign-\d+\.(?:jpe?g|png)/i.test(url);
  const usableImage = (url) => (url && !isPlaceholder(url) ? url : '');
  const imageUrl = usableImage(page.image) || usableImage(page.primaryObject?.primaryImage?.url) || '';
  const imageFallback = usableImage(page.primaryObject?.primaryImage?.url) || '';
  let body = htmlToMarkdown(page.processedHtml);

  const verdictText = typeof review.verdict === 'string' ? htmlToMarkdown(review.verdict) : '';
  if (verdictText && !body.includes(verdictText.slice(0, 60))) {
    body = `${body}\n\n### Verdict\n\n${verdictText}`;
  }

  const frontmatter = [
    '---',
    `slug: ${yamlString(row.slug)}`,
    `source_title: ${yamlString(row.title)}`,
    `source_url: ${yamlString(sourceUrl)}`,
    'source_site: IGN',
    `review_score: ${Number.isFinite(review.score) ? review.score : 'null'}`,
    `review_score_text: ${yamlString(review.scoreText ?? '')}`,
    `author: ${yamlString(author)}`,
    `published: ${yamlString(published)}`,
    `image: ${yamlString(imageUrl)}`,
    `image_fallback: ${yamlString(imageFallback)}`,
    '---',
  ].join('\n');

  const meta = [
    `- Source: [IGN](${sourceUrl})`,
    author ? `- Author: ${author}` : '',
    published ? `- Published: ${published}` : '',
    Number.isFinite(review.score) ? `- IGN score: ${review.score}/10${review.scoreText ? ` (${review.scoreText})` : ''}` : '',
  ].filter(Boolean);

  const header = [`# ${row.title} — IGN Review`, '', ...meta].join('\n');
  return `${frontmatter}\n\n${header}\n\n${body}\n`;
}

export async function fetchAndRenderIgnTarget(target, fetchPage) {
  const {status, page} = await fetchPage(target.sourceUrl);
  return {
    status,
    page,
    markdown: page ? renderIgnMarkdown(target.row, page, target.sourceUrl) : null,
  };
}
