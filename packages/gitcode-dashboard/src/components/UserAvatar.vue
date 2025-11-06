<template>
  <div class="user-avatar">
    <el-avatar :size="size" :src="avatarUrl" :alt="user?.login || 'User'">
      {{ userInitial }}
    </el-avatar>
    <span v-if="showName" class="user-name">
      {{ displayName }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { User } from '@/types';

interface Props {
  user?: User;
  size?: number;
  showName?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 32,
  showName: false,
});

const avatarUrl = computed(() => {
  return props.user?.avatar_url || undefined;
});

// 计算用户首字母
const userInitial = computed(() => {
  const login = props.user?.login || '?';
  return login.charAt(0).toUpperCase();
});

// 计算显示名称
const displayName = computed(() => {
  return props.user?.name || props.user?.login || 'Unknown';
});
</script>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 14px;
  color: #333;
}
</style>
