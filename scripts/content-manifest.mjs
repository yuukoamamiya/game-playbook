import {readdir, readFile} from 'node:fs/promises';
import {basename, resolve} from 'node:path';
import yaml from 'js-yaml';

import {root} from './data-store.mjs';

export const docsPath = resolve(root, 'docs/games');
export const imagePath = resolve(root, 'static/img/reviews-webp');

function parseAttributes(attributes) {
  return Object.fromEntries(
    [...attributes.matchAll(/(?:^|\s)(id|site|label)="([^"]*)"/g)]
      .map((match) => [match[1], match[2]]),
  );
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

export function hasTranslationContent(content) {
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return Boolean(content.trim()) && !/待补/.test(content) && cjk >= 30;
}

export async function readGameDocuments() {
  const files = (await readdir(docsPath)).filter((file) => (
    /\.mdx?$/.test(file) && !file.startsWith('_') && file !== 'index.md'
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
