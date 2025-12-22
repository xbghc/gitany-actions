import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getUserProfile } from '@/api/user';

// ============================================
// User 相关类型定义
// ============================================

/** 完整的用户资料信息 */
export interface UserProfile {
  avatar_url: string;
  followers_url: string;
  html_url: string;
  id: string;
  login: string;
  name: string;
  type: string;
  url: string;
  bio?: string;
  blog?: string;
  company?: string;
  email?: string;
  followers: number;
  following: number;
  top_languages: string[];
}

export const useUserStore = defineStore('user', () => {
  const userProfile = ref<UserProfile | null>(null);
  const loading = ref(false);

  const displayName = computed(() => {
    if (!userProfile.value) return '';
    return `${userProfile.value.name} (@${userProfile.value.login})`;
  });

  const fetchUserProfile = async () => {
    try {
      loading.value = true;
      const response = await getUserProfile();
      if (response.success && response.data) {
        userProfile.value = response.data;
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      userProfile.value = null;
    } finally {
      loading.value = false;
    }
  };

  const clearUserProfile = () => {
    userProfile.value = null;
  };

  return {
    userProfile,
    loading,
    displayName,
    fetchUserProfile,
    clearUserProfile,
  };
});
