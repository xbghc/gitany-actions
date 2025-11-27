import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getUserProfile } from '@/api/user';
import type { UserProfile } from '@/types';

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
