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
  | { type: 'adsPrivacy' }
  | { type: 'digestToggle' }
  | { type: 'none' };

export interface MenuItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  action: MenuAction;
}

export function buildMenuItems(appVersion: string, showAdsPrivacy: boolean): MenuItem[] {
  // GDPR対象ユーザー(UMPがREQUIREDを返す場合)のみ表示する同意変更導線
  const adsPrivacyItem: MenuItem[] = showAdsPrivacy
    ? [{ icon: 'ads-click', title: '広告のプライバシー設定', action: { type: 'adsPrivacy' } }]
    : [];
  // ストアレビューで「設定画面の項目名が英語表記」と指摘されたため日本語化(2026-08)
  return [
    { icon: 'select-all', title: '表示サイトの選択', action: { type: 'selectSites' } },
    // 通知タイプ別ON/OFF(オプトアウト導線がないと低評価レビューに直結する)
    { icon: 'notifications', title: '人気記事の通知(朝・夜)', action: { type: 'digestToggle' } },
    ...adsPrivacyItem,
    {
      icon: 'privacy-tip',
      title: 'プライバシーポリシー',
      action: { type: 'webview', title: 'プライバシーポリシー', url: PRIVACY_POLICY_URL },
    },
    {
      icon: 'privacy-tip',
      title: '利用規約(EULA)',
      action: { type: 'webview', title: '利用規約(EULA)', url: EULA_URL },
    },
    {
      icon: 'email',
      title: 'お問い合わせ',
      action: { type: 'webview', title: 'お問い合わせ', url: CONTACT_FORM_URL },
    },
    {
      icon: 'email',
      title: 'ヘルプ・フィードバック',
      action: { type: 'webview', title: 'ヘルプ・フィードバック', url: HELP_FORM_URL },
    },
    // 旧版は「App Version: 1.41」ハードコード。実バージョンを表示するよう是正
    { icon: 'arrow-circle-up', title: `アプリバージョン: ${appVersion}`, action: { type: 'none' } },
  ];
}
