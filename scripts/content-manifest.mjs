import {readdir, readFile} from 'node:fs/promises';
import {basename, resolve} from 'node:path';
import yaml from 'js-yaml';

import {root} from './data-store.mjs';

export const docsPath = resolve(root, 'docs/games');
export const imagePath = resolve(root, 'static/img/reviews-webp');

// JSX attributes can use either quote style, so accept both `attr="value"`
// and `attr='value'` (mixed within one tag is fine too).
function parseAttributes(attributes) {
  const parsed = {};
  for (const match of attributes.matchAll(
    /(?:^|\s)(id|site|label)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
  )) {
    parsed[match[1]] = match[2] ?? match[3];
  }
  return parsed;
}

export function parseDocument(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;

  const frontmatter = yaml.load(match[1]);
  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    throw new Error(file + ': frontmatter must be a YAML object');
  }

  const tabs = [...source.matchAll(/<ReviewTab\b([^>]*)>([\s\S]*?)<\/ReviewTab>/g)]
    .map((match) => {
      const attributes = parseAttributes(match[1]);
      return {
        id: attributes.id || attributes.site || '',
        site: attributes.site || '',
        label: attributes.label || '',
        content: match[2],
      };
    });

  return {
    file,
    source,
    frontmatter,
    slug: typeof frontmatter.slug === 'string' && frontmatter.slug
      ? frontmatter.slug
      : basename(file).replace(/\.mdx?$/, ''),
    tabs,
  };
}

// A tab counts as translated when it has at least 30 Han characters and no
// standalone placeholder line. The threshold filters out summaries, image
// captions and accidental one-line Chinese while still accepting short
// translated review snippets; it is deliberately shared by generate/validate.
export function hasTranslationContent(content) {
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const containsPlaceholder = content.split(/\r?\n/).some((line) => (
    /^\s*(?:[\p{Script=Han}A-Za-z0-9·]+\s*)?中文译文待补[。！!…]*\s*$/u.test(line)
    || /^\s*待补\s*$/u.test(line)
  ));
  return Boolean(content.trim()) && !containsPlaceholder && cjk >= 30;
}

export async function readGameDocuments() {
  const files = (await readdir(docsPath)).filter((file) => (
    /\.mdx?$/.test(file) && !file.startsWith('_') && !/^index\.mdx?$/.test(file)
  ));
  const documents = [];

  for (const file of files) {
    const document = parseDocument(await readFile(resolve(docsPath, file), 'utf8'), file);
    if (document) documents.push(document);
  }

  return documents;
}

export function translatedTabs(document) {
  return document.tabs
    .filter((tab) => tab.id && tab.site && tab.label && hasTranslationContent(tab.content))
    .map(({id, site, label}) => ({id, site, label}));
}
