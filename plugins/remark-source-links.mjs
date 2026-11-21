// GFM literal autolinks include full-width closing parentheses and a following
// middle dot in URLs such as 来源：IGN（https://example.com/review）· 作者….
// Correct only bare links in source metadata, leaving explicit Markdown links
// and parentheses that belong to the URL alone.
function closingWrapper(value) {
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '（') depth += 1;
    if (value[index] === '）') {
      if (depth === 0) return index;
      depth -= 1;
    }
  }
  return -1;
}

export default function remarkSourceLinks() {
  return (tree, file) => {
    const source = String(file.value);
    const walk = (node) => {
      if (node.type === 'paragraph'
        && /^(?:来源|原文)[:：]/.test(node.children?.[0]?.value ?? '')) {
        for (let index = 1; index < node.children.length; index += 1) {
          const link = node.children[index];
          const previous = node.children[index - 1];
          const offset = link.position?.start?.offset;
          if (link.type !== 'link' || previous.type !== 'text'
            || !previous.value.endsWith('（') || offset == null
            || !/^https?:\/\//.test(source.slice(offset))
            || link.children.length !== 1 || link.children[0].type !== 'text') continue;

          const end = closingWrapper(link.url);
          const label = link.children[0];
          const labelEnd = closingWrapper(label.value);
          if (end < 0 || labelEnd < 0) continue;

          const trailing = label.value.slice(labelEnd);
          link.url = link.url.slice(0, end);
          label.value = label.value.slice(0, labelEnd);
          node.children.splice(index + 1, 0, {type: 'text', value: trailing});
          index += 1;
        }
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
