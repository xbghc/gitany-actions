<template>
  <div class="repo-list" :class="{ collapsed: collapsed }">
    <div class="repo-list-header">
      <h3 v-show="!collapsed">{{ t('repo.list_title') }}</h3>
      <el-icon class="toggle-icon" @click="$emit('toggle')">
        <Expand v-if="collapsed" />
        <Fold v-else />
      </el-icon>
    </div>

    <div class="repo-items">
      <div
        v-for="repo in repoStore.repoList"
        :key="repo.id"
        class="repo-item"
        :class="{ active: repo.id === repoStore.selectedRepoId }"
        @click="handleSelectRepo(repo.id)"
        @mouseenter="handleMouseEnter(repo)"
        @mouseleave="handleMouseLeave"
      >
        <div class="repo-info">
          <el-icon class="repo-icon"><Folder /></el-icon>
          <div v-show="!collapsed" class="repo-name">
            <div class="owner">{{ repo.owner }}</div>
            <div class="name">{{ repo.repo }}</div>
          </div>
        </div>

        <el-button
          v-if="!collapsed && (repo.id === repoStore.selectedRepoId || hoveredRepoId === repo.id)"
          link
          type="danger"
          size="small"
          class="delete-btn"
          @click.stop="handleRemoveRepo(repo.id)"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <div v-if="repoStore.repoList.length === 0" class="empty-state">
        <el-empty
          :description="collapsed ? '' : t('repo.empty_list')"
          :image-size="collapsed ? 40 : 80"
        />
      </div>
    </div>

    <div class="repo-list-footer">
      <el-tooltip v-if="collapsed" :content="t('repo.add_repo')" placement="right">
        <el-button
          type="primary"
          size="small"
          :icon="Plus"
          class="add-btn-collapsed"
          @click="showAddDialog = true"
        />
      </el-tooltip>
      <el-button
        v-else
        type="primary"
        size="small"
        :icon="Plus"
        style="width: 100%"
        @click="showAddDialog = true"
      >
        {{ t('repo.add_repo') }}
      </el-button>
    </div>

    <!-- 添加仓库对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="t('repo.add_repo')"
      width="450px"
      :close-on-click-modal="false"
    >
      <el-form :model="addForm" label-width="80px">
        <el-form-item :label="t('repo.url_label')" required>
          <el-input
            v-model="addForm.repoUrl"
            :placeholder="t('repo.url_placeholder')"
            @input="handleRepoUrlChange"
          />
          <div class="form-hint">{{ t('repo.url_example') }}</div>
        </el-form-item>
        <el-divider>{{ t('repo.or_split') }}</el-divider>
        <el-form-item :label="t('repo.owner_label')">
          <el-input v-model="addForm.owner" :placeholder="t('repo.owner_placeholder')" />
        </el-form-item>
        <el-form-item :label="t('repo.name_label')">
          <el-input v-model="addForm.repo" :placeholder="t('repo.name_placeholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCancelAdd">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :disabled="!isFormValid" @click="handleAddRepo">
          {{ t('repo.add_action') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRepoStore, useActivityStore } from '@/store';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Folder, Plus, Close, Expand, Fold } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

defineProps<{
  collapsed: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();

const { t } = useI18n();
const repoStore = useRepoStore();
const activityStore = useActivityStore();

const showAddDialog = ref(false);
const hoveredRepoId = ref<string | null>(null);

const addForm = reactive({
  repoUrl: '',
  owner: '',
  repo: '',
});

onMounted(() => {
  repoStore.loadRepos();
});

const isFormValid = computed(() => {
  return addForm.owner.trim() && addForm.repo.trim();
});

// 解析仓库 URL 或 owner/repo 格式
const handleRepoUrlChange = () => {
  const input = addForm.repoUrl.trim();

  // 尝试从 URL 中提取 owner/repo
  const urlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?gitcode\.com\/([^/]+)\/([^/]+)/i);
  if (urlMatch) {
    addForm.owner = urlMatch[1];
    addForm.repo = urlMatch[2].replace(/\.git$/, '');
    return;
  }

  // 尝试直接解析 owner/repo 格式
  const simpleMatch = input.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (simpleMatch) {
    addForm.owner = simpleMatch[1];
    addForm.repo = simpleMatch[2];
  }
};

const handleMouseEnter = (repo: { id: string; owner: string; repo: string }) => {
  hoveredRepoId.value = repo.id;
  // Prefetch activity list
  // 使用当前筛选条件（但重置页码为 1），以匹配切换仓库后的请求行为
  activityStore.queryActivityList(repo.owner, repo.repo, {
    ...activityStore.filters,
    page: 1,
  });
};

const handleMouseLeave = () => {
  hoveredRepoId.value = null;
};

const handleSelectRepo = (id: string) => {
  repoStore.selectRepo(id);
};

const handleRemoveRepo = async (id: string) => {
  try {
    await ElMessageBox.confirm(t('repo.confirm_delete'), t('common.tips'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    });

    repoStore.removeRepo(id);
    ElMessage.success(t('common.delete_success'));
  } catch {
    // 用户取消删除
  }
};

const handleAddRepo = () => {
  if (!isFormValid.value) {
    ElMessage.warning(t('repo.input_full_info'));
    return;
  }

  const result = repoStore.addRepo(addForm.owner.trim(), addForm.repo.trim());

  if (result.success) {
    ElMessage.success(t('common.add_success'));
    handleCancelAdd();
  } else {
    ElMessage.warning(result.message);
  }
};

const handleCancelAdd = () => {
  showAddDialog.value = false;
  addForm.repoUrl = '';
  addForm.owner = '';
  addForm.repo = '';
};
</script>

<style scoped>
.repo-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: transparent;
  transition: width 0.3s;
}

.repo-list-header {
  height: 54px; /* Fix height to align with toggle */
  padding: 0 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.repo-list.collapsed .repo-list-header {
  justify-content: center;
  padding: 0;
}

.repo-list-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.toggle-icon {
  font-size: 20px;
  color: #606266;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.toggle-icon:hover {
  background-color: #f5f7fa;
}

.repo-items {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.repo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #606266;
  position: relative;
}

.repo-list.collapsed .repo-item {
  justify-content: center;
  padding: 12px 0;
  margin: 4px 4px;
}

.repo-item:hover {
  background-color: #f5f7fa;
  color: #303133;
}

.repo-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.repo-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.repo-list.collapsed .repo-info {
  justify-content: center;
  flex: 0;
}

.repo-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.repo-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

.repo-name .owner {
  opacity: 0.8;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.repo-name .name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  opacity: 0.7;
}

.delete-btn:hover {
  opacity: 1;
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: #909399;
}

.repo-list.collapsed .empty-state {
  padding: 24px 0;
}

.repo-list-footer {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: center;
}

.add-btn-collapsed {
  width: 100%;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 自定义滚动条 */
.repo-items::-webkit-scrollbar {
  width: 6px;
}

.repo-items::-webkit-scrollbar-track {
  background: transparent;
}

.repo-items::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.repo-items::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}
</style>
