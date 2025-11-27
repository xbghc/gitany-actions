import { createI18n } from 'vue-i18n';
import zh from './locales/zh';
import en from './locales/en';

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: localStorage.getItem('language') || 'zh', // default locale
  fallbackLocale: 'zh',
  messages: {
    zh,
    en,
  },
});

export default i18n;
