import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '持续内容生成系统',
  tagline: '从理论到实践，探索永不停歇的内容创造之道',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'lhqs', // Usually your GitHub org/user name.
  projectName: 'content-generation-system', // Usually your repo name.

  onBrokenLinks: 'warn',

  // 支持中文
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: false, // 禁用blog功能
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '持续内容生成系统',
      hideOnScroll: true,
      logo: {
        alt: 'Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '📖 内容',
          items: [
            {
              label: '核心理论',
              to: '/docs',
            },
            {
              label: '案例研究',
              to: '/docs/案例研究',
            },
            {
              label: '实战方案',
              to: '/docs/实战方案',
            },
          ],
        },
        {
          title: '🔧 技术',
          items: [
            {
              label: '技术深度',
              to: '/docs/技术深度',
            },
            {
              label: '进阶专题',
              to: '/docs/进阶专题',
            },
            {
              label: '视觉与设计',
              to: '/docs/视觉与设计',
            },
          ],
        },
        {
          title: '🌟 资源',
          items: [
            {
              label: '工具与资源库',
              to: '/docs/07-工具与资源库',
            },
            {
              label: '商业与变现',
              to: '/docs/商业与变现',
            },
          ],
        },
      ],
      copyright: `持续内容生成系统 © ${new Date().getFullYear()} • 采用 CC BY-SA 4.0 许可 • Built with Docusaurus`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
