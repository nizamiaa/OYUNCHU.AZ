import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import az from './locales/az.json';
import ru from './locales/ru.json';

const resources = {
  en: { translation: en },
  az: { translation: az },
  ru: { translation: ru },
};

const initialLang = (typeof window !== 'undefined' && localStorage.getItem('lang')) || 'az';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: 'az',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
