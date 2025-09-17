# VS Code 源代码映射配置

此配置已优化以支持 VS Code 中的源代码映射，现在您可以使用 Ctrl+点击 直接跳转到 TypeScript 源代码，而不是编译后的 JavaScript 文件。

## 已配置的功能

### 1. TypeScript 配置优化
- ✅ 启用 `sourceMap` 生成源映射文件
- ✅ 启用 `declarationMap` 生成声明映射
- ✅ 启用 `inlineSources` 将源代码嵌入到映射中
- ✅ 配置项目引用支持 monorepo 结构
- ✅ 路径映射 `@gitany/*` -> `packages/*/src`

### 2. esbuild 构建优化
- ✅ 使用 `sourcemap: 'both'` 生成内联和外联源映射
- ✅ 启用 `sourcesContent: true` 包含原始源代码
- ✅ 正确的相对路径映射

### 3. VS Code 工作区配置
- ✅ TypeScript 偏好设置（相对导入、自动导入等）
- ✅ 文件排除规则（忽略 `dist` 和 `node_modules`）
- ✅ 编辑器配置（格式化、代码检查等）

### 4. 调试配置
- ✅ 多种调试场景配置
- ✅ 源映射路径覆盖规则
- ✅ 任务配置（构建、开发等）

## 使用方法

### Ctrl+点击 跳转到源代码
现在当您在任何文件中看到 `GitcodeClient` 或其他导入时：
1. 按住 Ctrl 键
2. 点击类名/函数名
3. 将直接跳转到 TypeScript 源代码（`packages/gitcode/src/`）而不是编译后的代码

### 调试 TypeScript 代码
1. 在 TypeScript 文件中设置断点
2. 使用 F5 开始调试
3. 选择调试配置（如 "Debug TypeScript"）
4. 断点将正确命中并显示原始 TypeScript 代码

### 开发工作流
1. 使用 `pnpm dev` 启动开发模式（带监听）
2. 或使用 `Ctrl+Shift+B` 运行构建任务
3. VS Code 将自动检测源映射变更

## 验证配置
要验证配置是否正确工作：
1. 运行 `pnpm build` 重新构建项目
2. 在 VS Code 中尝试 Ctrl+点击 导入
3. 检查是否跳转到正确的 `.ts` 文件

## 故障排除

如果 Ctrl+点击 仍然跳转到 dist 目录：
1. 重启 VS Code
2. 运行 `Ctrl+Shift+P` -> "TypeScript: Restart TS Server"
3. 确保 `dist/` 文件夹被正确排除（已在 `.vscode/settings.json` 中配置）

## 技术细节

### 源映射类型
- **外联映射**: `.js.map` 文件，便于调试工具使用
- **内联映射**: 嵌入在 JavaScript 文件中的 Data URL，便于分发

### 路径映射
配置了以下路径映射规则：
```json
{
  "paths": {
    "@gitany/*": ["packages/*/src"]
  }
}
```

### 构建优化
所有包的构建脚本都已优化：
```javascript
{
  sourcemap: 'both',     // 同时生成内联和外联映射
  sourcesContent: true,  // 包含原始源代码
}
```