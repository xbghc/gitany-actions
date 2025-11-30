import { defineConfig } from 'vitepress';
import typedocSidebar from '../api-reference/typedoc-sidebar.json';

// 修复 TypeDoc 生成的侧边栏链接（移除 /docs 前缀）
function fixSidebarLinks(items: any[]): any[] {
  return items.map((item) => ({
    ...item,
    link: item.link?.replace(/^\/docs/, ''),
    items: item.items ? fixSidebarLinks(item.items) : undefined,
  }));
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'GitCode Monorepo 文档',
  description: 'gitcode 工具库与 CLI 使用说明',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/gitcode-api/' },
      { text: 'CLI', link: '/gitcode-cli/' },
      { text: 'API 参考', link: '/api-reference/' },
      { text: '贡献指南', link: '/contributing' },
    ],
    sidebar: {
      '/gitcode-api/': [
        { text: '概览', link: '/gitcode-api/' },
        { text: 'Pull Requests', link: '/gitcode-api/pr' },
        { text: 'Issues', link: '/gitcode-api/issue' },
        { text: 'Repository', link: '/gitcode-api/repo' },
        { text: 'User', link: '/gitcode-api/user' },
        { text: '测试', link: '/gitcode-api/testing' },
      ],
      '/gitcode-cli/': [
        { text: '概览', link: '/gitcode-cli/' },
        { text: 'Issue 命令', link: '/gitcode-cli/issue' },
      ],
      '/api-reference/': fixSidebarLinks(typedocSidebar),
    },
    outline: [2, 3],
    socialLinks: [{ icon: 'github', link: 'https://gitcode.com' }],
  },
});
