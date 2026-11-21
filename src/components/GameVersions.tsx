import React, {useEffect, useMemo, useState} from 'react';

// 生成器把每个 slug 的版本数据写成独立数组，形状见
// scripts/generate-games-data.mjs 的 src/generated/<kind>/<slug>.json 约定。
type VersionRecord = {
  sourceSlug: string;
  versionTitle: string;
  platform: string;
  score: number | null;
  releaseYear: number | null;
  metacriticUrl: string;
};

async function loadVersions(slug: string): Promise<VersionRecord[]> {
  try {
    const data = (await import(`@site/src/generated/versions/${slug}.json`)) as {
      default: VersionRecord[];
    };
    return Array.isArray(data.default) ? data.default : [];
  } catch {
    // 该 slug 没有版本数据文件时安静退场，不影响正文。
    return [];
  }
}

export default function GameVersions({slug}: {slug: string}): React.ReactElement | null {
  const [records, setRecords] = useState<VersionRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRecords(null);
    loadVersions(slug).then((list) => {
      if (!cancelled) setRecords(list);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const versions = useMemo(() => {
    const rows = records ?? [];
    return rows.filter((version, index, items) => (
      items.findIndex((item) => item.sourceSlug === version.sourceSlug) === index
    ));
  }, [records]);

  if (versions.length < 2) return null;

  return (
    <section aria-label="游戏版本" className="game-versions">
      <h2>版本信息</h2>
      <table>
        <caption className="visually-hidden">各平台版本的 Metacritic 评分</caption>
        <thead>
          <tr>
            <th scope="col">版本</th>
            <th scope="col">平台</th>
            <th scope="col">Metacritic</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => (
            <tr key={`${version.sourceSlug}:${version.platform}`}>
              <td>{version.versionTitle}</td>
              <td>{version.platform}</td>
              <td>
                {version.metacriticUrl && version.score != null ? (
                  <a href={version.metacriticUrl} target="_blank" rel="noopener noreferrer">
                    {version.score} ↗
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
