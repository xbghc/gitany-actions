<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-viewer" v-html="renderedMarkdown"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';

interface Props {
  content: string;
}

const props = defineProps<Props>();

const renderedMarkdown = computed(() => {
  if (!props.content) return '';
  try {
    return marked(props.content);
  } catch (error) {
    console.error('Markdown 渲染失败:', error);
    return props.content;
  }
});
</script>

<style scoped>
.markdown-viewer {
  line-height: 1.6;
  color: #333;
}

.markdown-viewer :deep(h1),
.markdown-viewer :deep(h2),
.markdown-viewer :deep(h3),
.markdown-viewer :deep(h4),
.markdown-viewer :deep(h5),
.markdown-viewer :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
}

.markdown-viewer :deep(p) {
  margin-bottom: 16px;
}

.markdown-viewer :deep(code) {
  background-color: #f6f8fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
}

.markdown-viewer :deep(pre) {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
}

.markdown-viewer :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-viewer :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.markdown-viewer :deep(a:hover) {
  text-decoration: underline;
}

.markdown-viewer :deep(ul),
.markdown-viewer :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

.markdown-viewer :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  padding-left: 16px;
  color: #666;
  margin: 16px 0;
}

.markdown-viewer :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.markdown-viewer :deep(table th),
.markdown-viewer :deep(table td) {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
}

.markdown-viewer :deep(table th) {
  background-color: #f6f8fa;
  font-weight: 600;
}
</style>
