import {readFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const versionsDirectory = resolve(projectRoot, 'src/generated/versions');

function getSlug(node) {
  const slug = node.attributes?.find((attribute) => attribute.name === 'slug')?.value;
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function text(value) {
  return {type: 'text', value: String(value)};
}

function tableCell(value, header = false) {
  return {
    type: 'tableCell',
    children: header ? [{type: 'strong', children: [text(value)]}] : [text(value)],
  };
}

function versionCell(record) {
  if (record.metacriticUrl && record.score != null) {
    return {
      type: 'tableCell',
      children: [{
        type: 'link',
        url: record.metacriticUrl,
        title: null,
        children: [text(`${record.score} ↗`)],
      }],
    };
  }
  return tableCell('—');
}

export function toVersionNodes(records) {
  const seen = new Set();
  const versions = records.filter((record) => {
    const key = `${record.sourceSlug}::${record.platform}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (versions.length < 2) return [];

  return [
    {type: 'heading', depth: 2, children: [text('版本信息')]},
    {
      type: 'table',
      align: [null, null, null],
      children: [
        {
          type: 'tableRow',
          children: [tableCell('版本', true), tableCell('平台', true), tableCell('Metacritic', true)],
        },
        ...versions.map((record) => ({
          type: 'tableRow',
          children: [
            tableCell(record.versionTitle),
            tableCell(record.platform),
            versionCell(record),
          ],
        })),
      ],
    },
  ];
}

export default function remarkGameVersions() {
  return async (tree) => {
    const replacements = new Map();
    const walk = (node, parent = null) => {
      if (node.type === 'mdxJsxFlowElement' && node.name === 'GameVersions') {
        const slug = getSlug(node);
        if (!slug) {
          throw new Error('GameVersions requires a slug made of lowercase letters, numbers, and hyphens.');
        }
        replacements.set(node, {slug, parent});
      }
      node.children?.forEach((child) => walk(child, node));
    };
    walk(tree);

    for (const [target, {slug, parent}] of replacements) {
      let records;
      try {
        records = JSON.parse(await readFile(resolve(versionsDirectory, `${slug}.json`), 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`GameVersions data is missing for slug "${slug}". Run npm run generate-data first.`, {cause: error});
        }
        throw error;
      }
      if (!Array.isArray(records)) {
        throw new Error(`GameVersions data for slug "${slug}" must be a JSON array.`);
      }
      const nodes = toVersionNodes(records);
      const siblings = parent.children;
      const index = siblings.indexOf(target);
      siblings.splice(index, 1, ...nodes);
    }
  };
}
