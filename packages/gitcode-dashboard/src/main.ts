import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';

import App from './App.vue';
import router from './router';
import { prefetchService } from './services/prefetch';
import { vPrefetch } from './directives/prefetch';

const app = createApp(App);
const pinia = createPinia();

app.directive('prefetch', vPrefetch);

app.use(pinia);
app.use(router);
app.use(ElementPlus);

// Start the prefetch service
prefetchService.start();

app.mount('#app');
