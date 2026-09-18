import React from 'react';
import games from '@site/src/generated/games.json';

type GameRecord = {
  slug: string;
  sourceSlug?: string;
  versionTitle: string;
  platform: string;
  score: number | null;
  releaseYear: number | null;
  metacriticUrl: string;
};

export default function GameVersions({slug}: {slug: string}): React.ReactNode {
  const versions = (games as GameRecord[])
    .filter((game) => game.slug === slug)
    .filter((game, index, items) => (
      items.findIndex((item) => item.sourceSlug === game.sourceSlug) === index
    ));

  if (versions.length < 2) return null;

  return (
    <section aria-label="游戏版本" className="game-versions">
      <h2>版本信息</h2>
      <table>
        <thead>
          <tr>
            <th>版本</th>
            <th>平台</th>
            <th>Metacritic</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => (
            <tr key={`${version.sourceSlug ?? version.slug}:${version.platform}`}>
              <td>{version.versionTitle}</td>
              <td>{version.platform}</td>
              <td>
                {version.metacriticUrl && version.score != null ? (
                  <a href={version.metacriticUrl} target="_blank" rel="noreferrer">
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
