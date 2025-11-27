/**
 * 用户相关测试数据 Fixtures
 */

/**
 * 有效的用户摘要数据
 */
export const validUserSummary = {
  id: '123456',
  login: 'testuser',
  name: 'Test User',
  avatar_url: 'https://gitcode.com/avatars/testuser.png',
  html_url: 'https://gitcode.com/testuser',
  followers_url: 'https://gitcode.com/api/v5/users/testuser/followers',
  following_url: 'https://gitcode.com/api/v5/users/testuser/following',
  gists_url: 'https://gitcode.com/api/v5/users/testuser/gists',
  starred_url: 'https://gitcode.com/api/v5/users/testuser/starred',
  subscriptions_url: 'https://gitcode.com/api/v5/users/testuser/subscriptions',
  organizations_url: 'https://gitcode.com/api/v5/users/testuser/orgs',
  repos_url: 'https://gitcode.com/api/v5/users/testuser/repos',
  events_url: 'https://gitcode.com/api/v5/users/testuser/events',
  received_events_url: 'https://gitcode.com/api/v5/users/testuser/received_events',
  type: 'User',
};

/**
 * 有效的用户资料数据
 */
export const validUserProfile = {
  ...validUserSummary,
  email: 'test@example.com',
  bio: 'A test user for unit tests',
  blog: 'https://testuser.blog',
  public_repos: 10,
  public_gists: 5,
  followers: 100,
  following: 50,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * 无效数据：id 类型错误
 */
export const invalidUserSummary_wrongIdType = {
  ...validUserSummary,
  id: 123456, // 应该是字符串
};

/**
 * 无效数据：缺少必需字段
 */
export const invalidUserSummary_missingLogin = {
  id: '123456',
  name: 'Test User',
  // 缺少 login 字段
};
