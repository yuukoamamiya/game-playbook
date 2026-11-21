import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkGameVersions from './plugins/remark-game-versions.mjs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// `docusaurus start` sets NODE_ENV=development and has no Pagefind bundle yet.
const isProduction = process.env.NODE_ENV === 'production';

const config: Config = {
  title: 'Playbook',
  tagline: '个人游戏评测档案',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
    // Faster builds and slightly smaller output via SWC / Lightning CSS.
    faster: {
      swcJsLoader: true,
      swcJsMinimizer: true,
      swcHtmlMinimizer: true,
      lightningCssMinimizer: true,
      // The eager Git VCS (enabled by future.v4) only looks up absolute paths,
      // so the sitemap plugin's relative source paths never resolve. Fall back
      // to the per-file git log strategy so lastmod can be generated.
      gitEagerVcs: false,
    },
  },

  // Production URL, used for canonical URLs, sitemap and social metadata.
  // Override with SITE_URL when building for a preview or a different host.
  url: process.env.SITE_URL ?? 'https://game-playbook.amamiyayuuko.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  // Search is indexed by Pagefind after `npm run build` (see package.json).
  // It shards its index into many small files, so the archive can grow past
  // Cloudflare Pages' 25 MiB per-file limit. The assets only exist in a built
  // site, so they are skipped during `docusaurus start`.
  headTags: isProduction
    ? [
        {
          tagName: 'link',
          attributes: {
            rel: 'stylesheet',
            href: '/pagefind/pagefind-component-ui.css',
            // 搜索样式只在打开面板时才用得到，别让它阻塞首屏：
            // 先当 print 表低优先级加载，onload 后再切回 all。
            media: 'print',
            onload: "this.media='all'",
          },
        },
        {
          tagName: 'script',
          attributes: {src: '/pagefind/pagefind-component-ui.js', type: 'module'},
        },
      ]
    : [],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          beforeDefaultRemarkPlugins: [remarkGameVersions],
          // Doc ids are built in sidebars.ts from the game slugs, so keep the
          // id equal to the file path: otherwise "13-sentinels-aegis-rim"
          // would be read as a sidebar position prefix and become
          // "sentinels-aegis-rim".
          numberPrefixParser: false,
        },
        blog: false,
        sitemap: {
          // Use each page's last git commit date so Search Console knows what changed.
          lastmod: 'date',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'PLAYBOOK / 游戏档案',
      items: [
        {to: '/', label: '游戏橱窗', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'librarySidebar',
          position: 'left',
          label: '文档库',
        },
        ...(isProduction
          ? [
              {
                type: 'html' as const,
                position: 'right' as const,
                value: '<pagefind-modal></pagefind-modal>',
              },
              {
                type: 'html' as const,
                position: 'right' as const,
                value:
                  '<pagefind-modal-trigger placeholder="搜索" compact></pagefind-modal-trigger>',
              },
            ]
          : []),
      ],
    },
    footer: {
      style: 'dark',
      copyright: `个人游戏档案库 · ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
