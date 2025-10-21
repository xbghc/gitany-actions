import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    // For simplicity, we assume the main view is sufficient for this task.
    // The App.vue will handle the main layout.
    component: () => Promise.resolve({}),
  },
  {
    path: '/issue/:issueNumber',
    name: 'IssueDetail',
    component: () => import('@/views/issue/IssueDetail.vue'),
    meta: { title: 'Issue 详情' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
