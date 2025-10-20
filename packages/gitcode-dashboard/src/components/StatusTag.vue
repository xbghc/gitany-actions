<template>
  <el-tag :type="tagType" :effect="effect">
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status: 'open' | 'closed' | 'merged';
  effect?: 'dark' | 'light' | 'plain';
}

const props = withDefaults(defineProps<Props>(), {
  effect: 'light',
});

const tagType = computed(() => {
  const typeMap = {
    open: 'success',
    closed: 'info',
    merged: 'primary',
  };
  return typeMap[props.status] as 'success' | 'info' | 'primary';
});

const label = computed(() => {
  const labelMap = {
    open: 'Open',
    closed: 'Closed',
    merged: 'Merged',
  };
  return labelMap[props.status];
});
</script>
