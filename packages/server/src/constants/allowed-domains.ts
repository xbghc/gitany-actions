/**
 * GitCode 允许的图片域名白名单（仅 hostname 部分）
 * 用于验证头像代理等场景，防止 SSRF 攻击
 */
export const GITCODE_IMAGE_HOSTNAMES = [
  'cdn-img.gitcode.com',
  'gitcode-user-img.obs.cn-north-4.myhuaweicloud.com',
] as const;

/**
 * 验证 URL 是否来自允许的 GitCode 图片域名
 * 使用 URL 解析防止 SSRF 攻击（如 cdn-img.gitcode.com.evil.com）
 *
 * @param url - 要验证的 URL
 * @returns 是否为合法的 GitCode 图片 URL
 */
export function isValidGitCodeImageUrl(url: string): boolean {
  try {
    // 解析 URL
    const parsedUrl = new URL(url);

    // 只允许 HTTPS 协议
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    // 精确匹配 hostname
    return GITCODE_IMAGE_HOSTNAMES.includes(
      parsedUrl.hostname as (typeof GITCODE_IMAGE_HOSTNAMES)[number],
    );
  } catch {
    // 无效的 URL 格式
    return false;
  }
}
