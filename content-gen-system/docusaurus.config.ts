import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '持续内容生成系统',
  tagline: '从理论到实践，探索永不停歇的内容创造之道',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.content-system.ninthfeast.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  onBrokenLinks: 'warn',

  // 支持中文
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  // SEO Metadata
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: '内容生成系统,AI内容创作,自动化内容,内容营销,SEO优化,内容策略,数字营销,持续内容生成,内容自动化,内容管理系统',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'author',
        content: 'lhqs',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'contact',
        content: 'lhqs1314@gmail.com',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content: '持续内容生成系统 - 从理论到实践，探索永不停歇的内容创造之道。学习AI内容创作、自动化内容生成、内容营销策略等核心技能。',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'canonical',
        href: 'https://docs.content-system.ninthfeast.com',
      },
    },
  ],

  // Custom metadata
  customFields: {
    author: 'lhqs',
    email: 'lhqs1314@gmail.com',
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          // SEO优化：为文档添加元数据
          editUrl: undefined,
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false, // 禁用blog功能
        theme: {
          customCss: './src/css/custom.css',
        },
        // 启用sitemap生成
        sitemap: {
          changefreq: 'weekly' as const,
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
        // Google Analytics (可选，需要配置ID)
        // gtag: {
        //   trackingID: 'G-XXXXXXXXXX',
        //   anonymizeIP: true,
        // },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // 社交分享卡片
    image: 'img/docusaurus-social-card.jpg',

    // SEO优化的元数据
    metadata: [
      {name: 'keywords', content: '内容生成系统,AI内容创作,自动化内容,内容营销,SEO优化,内容策略,数字营销'},
      {name: 'author', content: 'lhqs'},
      {property: 'og:type', content: 'website'},
      {property: 'og:title', content: '持续内容生成系统'},
      {property: 'og:description', content: '从理论到实践，探索永不停歇的内容创造之道'},
      {property: 'og:url', content: 'https://docs.content-system.ninthfeast.com'},
      {property: 'og:image', content: 'https://docs.content-system.ninthfeast.com/img/docusaurus-social-card.jpg'},
      {property: 'og:locale', content: 'zh_CN'},
      {name: 'twitter:card', content: 'summary_large_image'},
      {name: 'twitter:title', content: '持续内容生成系统'},
      {name: 'twitter:description', content: '从理论到实践，探索永不停歇的内容创造之道'},
      {name: 'twitter:image', content: 'https://docs.content-system.ninthfeast.com/img/docusaurus-social-card.jpg'},
    ],

    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '持续内容生成系统',
      hideOnScroll: true,
      logo: {
        alt: '持续内容生成系统 Logo',
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
        {
          title: '📧 联系',
          items: [
            {
              label: '联系作者',
              href: 'mailto:lhqs1314@gmail.com',
            },
            {
              html: `
                <div style="margin-top: 8px;">
                  <small>作者: lhqs</small>
                </div>
              `,
            },
          ],
        },
      ],
      copyright: `持续内容生成系统 © ${new Date().getFullYear()} • 作者: lhqs • 采用 CC BY-SA 4.0 许可 • Built with Docusaurus`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
