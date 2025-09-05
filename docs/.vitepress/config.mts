import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'GitAny Monorepo 文档',
  description: 'gitcode 工具库与 CLI 使用说明',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '库：gitcode', link: '/gitcode/' },
      { text: 'CLI', link: '/cli/' },
      { text: '贡献指南', link: '/contributing' },
    ],
    sidebar: {
      '/gitcode/': [
        { text: '概览', link: '/gitcode/' },
      ],
      '/cli/': [
        { text: '概览', link: '/cli/' },
      ],
    },
    outline: [2, 3],
    socialLinks: [
      { icon: 'github', link: 'https://gitcode.com' },
    ],
  },
});
