import { createApp } from 'vue';
import { createPinia } from 'pinia';
// Element Plus 组件通过 unplugin-vue-components 按需自动导入
// 样式仍需全局引入
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';

import App from './App.vue';
import router from './router';
import i18n from './i18n';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

app.mount('#app');
