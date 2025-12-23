import * as vscode from 'vscode';

import en from '../../assets/i18n/en.json';
import zhCN from '../../assets/i18n/zh-cn.json';

export class I18nUtils {
  private static map: Record<string, any> = {
    en: en,
    'zh-cn': zhCN
  };

  private static lang = vscode.env.language.toLowerCase();

  public static messages = this.map[this.lang] || en;

  public static t(key: string, fallback?: string) {
    return this.messages[key] ?? fallback ?? key;
  }
}
