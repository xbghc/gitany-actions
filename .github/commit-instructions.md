# Goal
生成可读、可检索、可回滚的提交信息。面向人类读者与自动化工具。

# Format
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>

# Types
feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert

# Rules: Subject
- 使用祈使句，描述“做什么”，非“做了什么”。例：add，不是 added / adds
- 中文或英文均可，但保持一致；推荐英文主题，中文可放 body
- ≤ 50 字符；不以句号结尾；避免表情与语气词
- 示例：feat(ui): add virtual list to chat panel

# Rules: Scope
- 细粒度模块或包名：ui | api | auth | store | i18n | docs | build | app-name
- monorepo 用包名或目录名：pkg/chat-composer | web | server

# Rules: Body
- 72 列软换行；说明动机、做法与影响面
- 结构模板：
  - WHY: 触发原因或问题背景
  - WHAT: 做了哪些变更（列要点）
  - HOW: 关键实现或算法/权衡
  - RISK: 破坏性变化/边界/迁移指引
- 可加入性能/安全数据与对比（如前后耗时、bundle 体积）

# Rules: Footer
- 关联：Refs/Closes #123
- 破坏性：BREAKING CHANGE: 描述迁移与替代方案
- 共作者：Co-authored-by: Name <email>

# Language
- 若面向团队中文读者：主题英文 + 正文中文，或全中文；统一即可
- 术语用项目内既有翻译或英文原语

# Anti-patterns
- ❌ "update", "fix bug", "wip", "misc"
- ❌ 含密钥、token、内部链接或用户数据
- ❌ 将多个独立变更堆在一次提交

# Examples
feat(chat-composer): add virtualized message list

WHY: large rooms scroll with jank on mid-tier laptops
WHAT:
- introduce react-window based list
- keep last 100 items hydrated; others lazy load
HOW:
- item key = messageId to avoid re-mount
- memoize row renderer; avoid inline handlers
RISK:
- custom scroll handling may affect tests

Refs #321

fix(api): debounce search request to reduce duplicate calls

WHAT:
- add 300ms debounce on query input
- cancel inflight request on new keystroke
RISK:
- none; covered by unit tests

Closes #457
