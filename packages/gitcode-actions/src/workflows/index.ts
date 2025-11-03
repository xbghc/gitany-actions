export { chat } from './chat.js';
export type { ChatOptions, ChatResult } from './chat.js';

export { testShaBuild } from './test-sha-build.js';
export type { TestShaBuildOptions, TestShaBuildResult } from '../container/types.js';

export { createApiCallScript } from './call-anthropic.js';
export type { CreateApiCallScriptOptions } from './call-anthropic.js';

export { watchMentions, runMentionsOnce } from './mention-watcher.js';
export { defaultPromptBuilder } from './mention-prompt.js';
export { createReplyComment, editReplyComment, defaultReplyBodyBuilder } from './mention-reply.js';
export type {
  MentionContext,
  MentionSource,
  MentionReply,
  MentionWatcherHandle,
  BuildMentionPrompt,
  BuildMentionReplyBody,
  WatchMentionsOptions,
  IssueContext,
  PrContext,
} from './mention-types.js';
