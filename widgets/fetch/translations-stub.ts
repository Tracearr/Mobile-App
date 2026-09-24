// What @tracearr/translations/mobile resolves to inside the widget fetch bundle
// (widgets/fetch/metro.config.js): the same i18next instance and Intl formatters,
// without react-i18next or the thirty statically imported locales.
export { default as i18n } from 'i18next';
export {
  formatBitrate,
  formatDateTime,
  formatNumber,
  formatTime,
} from '@tracearr/translations/formatting';
