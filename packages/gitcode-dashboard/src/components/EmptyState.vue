<template>
  <div class="empty-state">
    <el-empty :description="description">
      <template v-if="actionText && actionHandler">
        <el-button type="primary" @click="actionHandler">{{ actionText }}</el-button>
      </template>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
interface Props {
  description?: string;
  actionText?: string;
  actionHandler?: () => void;
}

withDefaults(defineProps<Props>(), {
  description: '暂无数据',
});
</script>

<style scoped>
.empty-state {
  padding: 40px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
