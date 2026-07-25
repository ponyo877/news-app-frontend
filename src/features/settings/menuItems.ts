import type { MaterialIcons } from '@expo/vector-icons';

import { BASE_URL } from '@/api/client';

// 設定メニュー(旧SettingScreenのfactory内リストをデータ駆動化)
export const CONTACT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSd-fuupDifDoJQ1uTkdyUCgzEiNvfUzdJe0YOhPfdSC3U2Erw/viewform?usp=sf_link';
export const HELP_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfKg5WOizYtdmAUdTUGvGoOTxHeARTzyiomS6fSiV8f6DfFVQ/viewform?usp=sf_link';
export const PRIVACY_POLICY_URL = `${BASE_URL}/static/privacy_policy/`;
export const EULA_URL = `${BASE_URL}/static/eula/`;

export type MenuAction =
  | { type: 'selectSites' }
  | { type: 'webview'; title: string; url: string }
  | { type: 'none' };

export interface MenuItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  action: MenuAction;
}

export function buildMenuItems(appVersion: string): MenuItem[] {
  return [
    { icon: 'select-all', title: 'Select Site', action: { type: 'selectSites' } },
    {
      icon: 'privacy-tip',
      title: 'Privacy Policy',
      action: { type: 'webview', title: 'Privacy Policy', url: PRIVACY_POLICY_URL },
    },
    {
      icon: 'privacy-tip',
      title: 'EULA',
      action: { type: 'webview', title: 'EULA', url: EULA_URL },
    },
    {
      icon: 'email',
      title: 'Contact Us',
      action: { type: 'webview', title: 'Contact Us', url: CONTACT_FORM_URL },
    },
    {
      icon: 'email',
      title: 'Help & Feedback',
      action: { type: 'webview', title: 'Help & Feedback', url: HELP_FORM_URL },
    },
    // 旧版は「App Version: 1.41」ハードコード。実バージョンを表示するよう是正
    { icon: 'arrow-circle-up', title: `App Version: ${appVersion}`, action: { type: 'none' } },
  ];
}
