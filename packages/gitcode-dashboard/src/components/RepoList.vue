<template>
  <div class="repo-list" :class="{ collapsed: collapsed }">
    <div class="repo-list-header">
      <h3 v-show="!collapsed">仓库列表</h3>
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
          <div class="repo-name" v-show="!collapsed">
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
        <el-empty :description="collapsed ? '' : '暂无仓库'" :image-size="collapsed ? 40 : 80" />
      </div>
    </div>

    <div class="repo-list-footer">
      <el-tooltip v-if="collapsed" content="添加仓库" placement="right">
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
        添加仓库
      </el-button>
    </div>

    <!-- 添加仓库对话框 -->
    <el-dialog v-model="showAddDialog" title="添加仓库" width="450px" :close-on-click-modal="false">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="仓库地址" required>
          <el-input
            v-model="addForm.repoUrl"
            placeholder="输入 owner/repo 或完整 URL"
            @input="handleRepoUrlChange"
          />
          <div class="form-hint">例如: octocat/hello-world</div>
        </el-form-item>
        <el-divider>或分别输入</el-divider>
        <el-form-item label="所有者">
          <el-input v-model="addForm.owner" placeholder="所有者/组织名称" />
        </el-form-item>
        <el-form-item label="仓库名">
          <el-input v-model="addForm.repo" placeholder="仓库名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCancelAdd">取消</el-button>
        <el-button type="primary" :disabled="!isFormValid" @click="handleAddRepo"> 添加 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRepoStore, useActivityStore } from '@/store';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Folder, Plus, Close, Expand, Fold } from '@element-plus/icons-vue';

defineProps<{
  collapsed: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();

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
    await ElMessageBox.confirm('确定要删除这个仓库吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });

    repoStore.removeRepo(id);
    ElMessage.success('删除成功');
  } catch {
    // 用户取消删除
  }
};

const handleAddRepo = () => {
  if (!isFormValid.value) {
    ElMessage.warning('请输入完整的仓库信息');
    return;
  }

  const result = repoStore.addRepo(addForm.owner.trim(), addForm.repo.trim());

  if (result.success) {
    ElMessage.success('添加成功');
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
  background-color: #001529;
  transition: width 0.3s;
}

.repo-list-header {
  height: 54px; /* Fix height to align with toggle */
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  color: #fff;
  white-space: nowrap;
}

.toggle-icon {
  font-size: 20px;
  color: #fff;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.toggle-icon:hover {
  background-color: rgba(255, 255, 255, 0.1);
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
  color: rgba(255, 255, 255, 0.65);
  position: relative;
}

.repo-list.collapsed .repo-item {
  justify-content: center;
  padding: 12px 0;
  margin: 4px 4px;
}

.repo-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.repo-item.active {
  background-color: #409eff; /* Changed to match user image typical blue */
  color: #fff;
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
  color: rgba(255, 255, 255, 0.45);
}

.repo-list.collapsed .empty-state {
  padding: 24px 0;
}

.repo-list-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.05);
}

.repo-items::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.repo-items::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
