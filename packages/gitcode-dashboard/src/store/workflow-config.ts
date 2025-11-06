import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type {
  WorkflowConfig,
  CreateWorkflowConfigRequest,
  UpdateWorkflowConfigRequest,
} from '@/types';
import {
  getWorkflowConfigs,
  createWorkflowConfig as apiCreateWorkflowConfig,
  updateWorkflowConfig as apiUpdateWorkflowConfig,
  deleteWorkflowConfig as apiDeleteWorkflowConfig,
} from '@/api';
import { useRepoStore } from './repo';
import { ElMessage } from 'element-plus';

export const useWorkflowConfigStore = defineStore('workflow-config', () => {
  const repoStore = useRepoStore();

  // 配置列表
  const configList = ref<WorkflowConfig[]>([]);
  const loading = ref(false);
  const totalCount = ref(0);

  /**
   * 获取配置列表
   */
  const fetchConfigList = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      configList.value = [];
      totalCount.value = 0;
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      const response = await getWorkflowConfigs(repoStore.currentOwner, repoStore.currentRepo);

      if (response.data) {
        configList.value = response.data.configs || [];
        totalCount.value = response.data.count || 0;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 Workflow 配置列表失败:', error);
      }
      configList.value = [];
      totalCount.value = 0;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 创建新配置
   */
  const createConfig = async (config: CreateWorkflowConfigRequest) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      ElMessage.error('请先选择仓库');
      return false;
    }

    try {
      const response = await apiCreateWorkflowConfig(
        repoStore.currentOwner,
        repoStore.currentRepo,
        config,
      );

      if (response.data) {
        ElMessage.success('配置创建成功');
        // 刷新列表
        await fetchConfigList();
        return true;
      }
      return false;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('创建 Workflow 配置失败:', error);
      }
      return false;
    }
  };

  /**
   * 更新配置
   */
  const updateConfig = async (configId: string, config: UpdateWorkflowConfigRequest) => {
    try {
      const response = await apiUpdateWorkflowConfig(configId, config);

      if (response.data) {
        ElMessage.success('配置更新成功');
        // 刷新列表
        await fetchConfigList();
        return true;
      }
      return false;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('更新 Workflow 配置失败:', error);
      }
      return false;
    }
  };

  /**
   * 删除配置
   */
  const deleteConfig = async (configId: string) => {
    try {
      await apiDeleteWorkflowConfig(configId);
      ElMessage.success('配置删除成功');
      // 刷新列表
      await fetchConfigList();
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('删除 Workflow 配置失败:', error);
      }
      return false;
    }
  };

  /**
   * 重置所有状态
   */
  const resetState = () => {
    configList.value = [];
    totalCount.value = 0;
    loading.value = false;
  };

  // 监听仓库切换，自动重新加载数据
  watch(
    () => repoStore.selectedRepoId,
    async (newRepoId) => {
      if (newRepoId) {
        resetState();
        await fetchConfigList();
      } else {
        resetState();
      }
    },
    { immediate: true },
  );

  return {
    configList,
    loading,
    totalCount,
    fetchConfigList,
    createConfig,
    updateConfig,
    deleteConfig,
    resetState,
  };
});
