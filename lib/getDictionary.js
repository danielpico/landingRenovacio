export const LANGS = ['ca', 'es', 'en', 'fr'];
export const DEFAULT_LANG = 'ca';

const loaders = {
  ca: () => import('./dictionaries/ca').then(m => m.default),
  es: () => import('./dictionaries/es').then(m => m.default),
  en: () => import('./dictionaries/en').then(m => m.default),
  fr: () => import('./dictionaries/fr').then(m => m.default),
};

export async function getDictionary(lang) {
  return (loaders[lang] ?? loaders.ca)();
}
