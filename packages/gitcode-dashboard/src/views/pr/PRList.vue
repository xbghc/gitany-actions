<template>
  <div class="pr-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>Pull Request 列表</h3>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filters">
        <el-form :inline="true">
          <el-form-item label="状态">
            <el-select v-model="filters.state" placeholder="选择状态" style="width: 120px" @change="handleFilterChange">
              <el-option label="全部" value="all" />
              <el-option label="Open" value="open" />
              <el-option label="Closed" value="closed" />
              <el-option label="Merged" value="merged" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="RefreshRight" @click="handleRefresh">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- PR 列表 -->
      <el-table
        v-loading="loading"
        :data="prList"
        style="width: 100%"
      >
        <el-table-column prop="number" label="编号" width="80" />
        <el-table-column label="标题" min-width="300">
          <template #default="{ row }">
            <div class="pr-title">
              <span>{{ row.title }}</span>
              <div class="pr-labels">
                <el-tag
                  v-for="label in row.labels"
                  :key="label.id"
                  size="small"
                  :color="'#' + label.color"
                >
                  {{ label.name }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusTag :status="row.state" />
          </template>
        </el-table-column>
        <el-table-column label="作者" width="150">
          <template #default="{ row }">
            <UserAvatar :user="row.user" :show-name="true" />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <EmptyState v-if="!loading && prList.length === 0" description="暂无 PR" />

      <!-- 分页 -->
      <div class="pagination" @mouseenter="handlePaginationHover">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.per_page"
          :total="totalCount"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleFilterChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { RefreshRight } from '@element-plus/icons-vue';
import { usePRStore } from '@/store';
import { useIdlePrefetch } from '@/composables/useIdlePrefetch';
import StatusTag from '@/components/StatusTag.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import EmptyState from '@/components/EmptyState.vue';

const prStore = usePRStore();

// 使用 storeToRefs 解构响应式状态
const { prList, loading, filters, prCount } = storeToRefs(prStore);
// 方法可以直接解构
const { fetchPRList, prefetchNextPage, refreshWithIncremental, refreshFullData } = prStore;

// Idle Prefetch
const { scheduleIdlePrefetch } = useIdlePrefetch();

// 计算当前筛选状态下的 PR 总数
const totalCount = computed(() => {
  if (!prCount.value) return 0;

  switch (filters.value.state) {
    case 'open':
      return prCount.value.opened || 0;
    case 'closed':
      return prCount.value.closed || 0;
    case 'merged':
      return prCount.value.merged || 0;
    case 'all':
    default:
      return prCount.value.all || 0;
  }
});

// 由于 store 中已经监听了 selectedRepoId 的变化，会自动加载数据
// 这里只需要提供手动刷新的功能

/**
 * 换页处理：先显示缓存，再静默增量更新
 */
const handlePageChange = async () => {
  // 1. 先从缓存读取并显示
  await fetchPRList();
  // 2. 静默增量更新（不显示 loading）
  await refreshWithIncremental(true);
};

/**
 * 筛选变化：先显示缓存，再增量更新
 */
const handleFilterChange = async () => {
  filters.value.page = 1;
  // 1. 先从缓存读取并显示
  await fetchPRList();
  // 2. 再增量更新
  await refreshWithIncremental();
};

/**
 * 刷新按钮：全量刷新
 */
const handleRefresh = async () => {
  await refreshFullData();
};

// 监听数据变化，处理分页超出范围的情况
watch([prList, () => filters.value.page], () => {
  // 如果返回数据为空，且不是第1页，说明可能超出了范围
  const currentPage = filters.value.page || 1;
  if (prList.value.length === 0 && currentPage > 1 && totalCount.value > 0 && !loading.value) {
    // 自动跳转到第一页
    filters.value.page = 1;
    handlePageChange();
  }
});

// 监听加载状态，当数据加载完成后，使用 idle callback 预取下一页
watch(loading, (isLoading) => {
  if (!isLoading && prList.value.length > 0) {
    scheduleIdlePrefetch(() => {
      prefetchNextPage();
    });
  }
});

// 分页器 hover 时预取下一页
const handlePaginationHover = () => {
  // 立即预取下一页，如果已缓存则不会重复请求
  prefetchNextPage();
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN');
};
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
}

.filters {
  margin-bottom: 16px;
}

.pr-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pr-labels {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}
</style>
