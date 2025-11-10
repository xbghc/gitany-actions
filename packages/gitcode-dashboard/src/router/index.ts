import { useAuthStore } from '@/store';
import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/oauth/callback',
    name: 'OAuthCallback',
    component: () => import('@/views/OAuthCallback.vue'),
    meta: { title: 'OAuth 授权', requiresAuth: false },
  },
  {
    path: '/',
    name: 'Main',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { title: '首页', requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫：未登录跳转到登录页
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth !== false; // 默认需要认证

  if (requiresAuth && !authStore.isConfigured) {
    // 需要认证但未登录
    next({ name: 'Login' });
  } else if (to.name === 'Login' && authStore.isConfigured) {
    // 已登录用户访问登录页，跳转到首页
    next('/');
  } else {
    next();
  }
});

export default router;
