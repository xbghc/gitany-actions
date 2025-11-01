#!/usr/bin/env node

// Exercises PR container lifecycle and comment posting in Gitcode.
import { config } from 'dotenv';
import {
  createPrContainer,
  removeContainer,
  getContainer,
} from '../../packages/gitcode-actions/dist/index.js';
import { GitcodeClient, parseGitUrl, toGitUrl } from '../../packages/gitcode-api/dist/index.js';

config({ path: new URL('.env', import.meta.url) });

/**
 * 环境变量说明：
 * - TEST_REPO_URL：需要测试的仓库 URL（https 或 .git）
 * - TEST_PR_NUMBER：目标 PR 编号
 * - TEST_COMMENT_BODY：用于发布的评论内容
 * - TEST_CONTAINER_IMAGE：可选，自定义容器镜像，默认 node:20
 * - TEST_PR_MAX_PAGES：可选，拉取 PR 列表时的最大分页数，默认 3
 * - TEST_KEEP_CONTAINER：可选，设置为 1/true/yes 时保留已创建的容器
 */

function envTrim(name) {
  const raw = process.env[name];
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  return value.length ? value : undefined;
}

function envPositiveInteger(name, fallback) {
  const raw = envTrim(name);
  if (raw === undefined) {
    return fallback;
  }
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`环境变量 ${name} 需要正整数，当前值为 ${raw}`);
  }
  return num;
}

function envBoolean(name, fallback = false) {
  const raw = envTrim(name);
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

async function locatePullRequest(client, repoUrl, prNumber, maxPages) {
  for (let page = 1; page <= maxPages; page += 1) {
    const pulls = await client.pr.list(repoUrl, { state: 'all', page, per_page: 50 });
    if (!pulls.length) {
      return null;
    }
    const found = pulls.find((pr) => pr.number === prNumber);
    if (found) return found;
  }
  return null;
}

async function main() {
  const repoUrl = envTrim('TEST_REPO_URL');
  if (!repoUrl) {
    throw new Error('缺少环境变量 TEST_REPO_URL');
  }

  const parsedRepo = parseGitUrl(repoUrl);
  if (!parsedRepo) {
    throw new Error(`无法解析仓库地址 ${repoUrl}，需要标准的 Git URL`);
  }

  const prNumber = envPositiveInteger('TEST_PR_NUMBER');
  if (!prNumber) {
    throw new Error('缺少环境变量 TEST_PR_NUMBER');
  }

  const commentBody = envTrim('TEST_COMMENT_BODY');
  if (!commentBody) {
    throw new Error('缺少环境变量 TEST_COMMENT_BODY');
  }

  const image = envTrim('TEST_CONTAINER_IMAGE') ?? 'node:20';
  const maxPages = envPositiveInteger('TEST_PR_MAX_PAGES', 3);
  const keepContainer = envBoolean('TEST_KEEP_CONTAINER', false);

  console.log('🔐 初始化 Gitcode 客户端...');
  const client = new GitcodeClient();

  console.log(`📥 查找 PR #${prNumber} (最多 ${maxPages} 页)...`);
  const pr = await locatePullRequest(client, repoUrl, prNumber, maxPages);
  if (!pr) {
    throw new Error(`未找到 PR #${prNumber}，可通过 TEST_PR_MAX_PAGES 增大拉取范围`);
  }
  console.log(`✅ 已找到 PR: ${pr.title}`);

  const baseRepoUrl = toGitUrl(repoUrl);
  let existingContainerId;
  try {
    const existing = await getContainer({ pr: pr.id, repoUrl: baseRepoUrl });
    existingContainerId = existing?.id;
  } catch (error) {
    console.warn('⚠️ 无法检查现有容器状态:');
    console.warn(error instanceof Error ? error.message : error);
  }

  console.log(`🐳 创建/复用容器 (镜像: ${image})...`);
  const container = await createPrContainer(repoUrl, pr, { image });
  if (container?.id) {
    console.log(`容器 ID: ${container.id}`);
  }

  let createdComment;
  try {
    console.log('💬 正在创建 PR 评论...');
    createdComment = await client.pr.createComment(repoUrl, pr.number, commentBody);
  } catch (error) {
    console.error('❌ 创建 PR 评论失败:');
    console.error(error instanceof Error ? error.message : error);
    throw error;
  } finally {
    if (!keepContainer && !existingContainerId) {
      console.log('🧹 清理测试容器...');
      try {
        await removeContainer(pr.id);
      } catch (cleanupErr) {
        console.warn('⚠️ 移除容器失败:');
        console.warn(cleanupErr instanceof Error ? cleanupErr.message : cleanupErr);
      }
    } else if (!keepContainer) {
      console.log('ℹ️ 检测到已有容器，跳过删除避免影响现有环境');
    } else {
      console.log('ℹ️ 已按要求保留容器用于调试');
    }
  }

  console.log('✅ 评论已成功创建!');
  console.log(`   评论 ID: ${createdComment.id}`);
  const preview =
    createdComment.body.length > 80
      ? `${createdComment.body.slice(0, 77)}...`
      : createdComment.body;
  console.log(`   内容预览: "${preview}"`);
  console.log('🎉 容器创建与评论功能测试完成');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 测试执行过程中发生异常:');
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
  });
}
