import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Repository {
  id: string;
  owner: string;
  repo: string;
}

const REPOS_KEY = 'gitcode_repos';
const SELECTED_REPO_KEY = 'gitcode_selected_repo';

export const useRepoStore = defineStore('repo', () => {
  // 仓库列表
  const repoList = ref<Repository[]>([]);

  // 当前选中的仓库 ID
  const selectedRepoId = ref<string | null>(null);

  // 计算属性：当前选中的仓库对象
  const selectedRepo = computed(() => {
    if (!selectedRepoId.value) return null;
    return repoList.value.find((r) => r.id === selectedRepoId.value) || null;
  });

  // 计算属性：当前仓库的 owner
  const currentOwner = computed(() => selectedRepo.value?.owner || '');

  // 计算属性：当前仓库的 repo
  const currentRepo = computed(() => selectedRepo.value?.repo || '');

  // 生成仓库 ID
  const generateRepoId = (owner: string, repo: string) => {
    return `${owner}/${repo}`;
  };

  // 添加仓库
  const addRepo = (owner: string, repo: string) => {
    const id = generateRepoId(owner, repo);

    // 检查是否已存在
    const exists = repoList.value.some((r) => r.id === id);
    if (exists) {
      return { success: false, message: '仓库已存在' };
    }

    // 添加到列表
    const newRepo: Repository = { id, owner, repo };
    repoList.value.push(newRepo);

    // 如果是第一个仓库，自动选中
    if (repoList.value.length === 1) {
      selectedRepoId.value = id;
    }

    // 保存到 localStorage
    saveRepos();

    return { success: true, message: '添加成功', repo: newRepo };
  };

  // 删除仓库
  const removeRepo = (id: string) => {
    const index = repoList.value.findIndex((r) => r.id === id);
    if (index === -1) return;

    repoList.value.splice(index, 1);

    // 如果删除的是当前选中的仓库
    if (selectedRepoId.value === id) {
      // 自动选中第一个仓库（如果有）
      selectedRepoId.value = repoList.value.length > 0 ? repoList.value[0].id : null;
    }

    // 保存到 localStorage
    saveRepos();
  };

  // 选择仓库
  const selectRepo = (id: string) => {
    const repo = repoList.value.find((r) => r.id === id);
    if (!repo) return;

    selectedRepoId.value = id;
    localStorage.setItem(SELECTED_REPO_KEY, id);
  };

  // 保存到 localStorage
  const saveRepos = () => {
    localStorage.setItem(REPOS_KEY, JSON.stringify(repoList.value));
    if (selectedRepoId.value) {
      localStorage.setItem(SELECTED_REPO_KEY, selectedRepoId.value);
    } else {
      localStorage.removeItem(SELECTED_REPO_KEY);
    }
  };

  // 从 localStorage 加载
  const loadRepos = () => {
    const savedRepos = localStorage.getItem(REPOS_KEY);
    if (savedRepos) {
      try {
        repoList.value = JSON.parse(savedRepos);
      } catch (e) {
        console.error('Failed to parse saved repos:', e);
        repoList.value = [];
      }
    }

    // 如果没有仓库数据，添加默认仓库
    if (repoList.value.length === 0) {
      const defaultRepos = [
        { owner: 'xbghc', repo: 'gitcode-actions' },
        { owner: 'DevCloudFE', repo: 'MateChat' },
      ];

      defaultRepos.forEach(({ owner, repo }) => {
        addRepo(owner, repo);
      });
    }

    const savedSelectedId = localStorage.getItem(SELECTED_REPO_KEY);
    if (savedSelectedId && repoList.value.some((r) => r.id === savedSelectedId)) {
      selectedRepoId.value = savedSelectedId;
    } else if (repoList.value.length > 0) {
      // 如果没有选中的仓库，默认选中第一个
      selectedRepoId.value = repoList.value[0].id;
    }
  };

  return {
    // 状态
    repoList,
    selectedRepoId,
    selectedRepo,
    currentOwner,
    currentRepo,

    // 方法
    addRepo,
    removeRepo,
    selectRepo,
    loadRepos,
    saveRepos,
  };
});
