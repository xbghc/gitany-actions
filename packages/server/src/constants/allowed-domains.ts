/**
 * GitCode 允许的图片域名白名单
 * 用于验证头像代理等场景，防止代理任意外部资源
 */
export const GITCODE_IMAGE_DOMAINS = [
  'https://cdn-img.gitcode.com/',
  'https://gitcode-user-img.obs.cn-north-4.myhuaweicloud.com:443/',
  'https://gitcode-user-img.obs.cn-north-4.myhuaweicloud.com/',
] as const;

/**
 * 验证 URL 是否来自允许的 GitCode 图片域名
 * @param url - 要验证的 URL
 * @returns 是否为合法的 GitCode 图片 URL
 */
export function isValidGitCodeImageUrl(url: string): boolean {
  return GITCODE_IMAGE_DOMAINS.some(domain => url.startsWith(domain));
}
