import * as vscode from 'vscode';
import { ConfigDa } from '../data/ConfigDb';

export class CatCommand {
    public static init(context: vscode.ExtensionContext) {
        // 聊天参与者
        const askDespose = vscode.commands.registerCommand('my-lovely-cat.ask', () => {
            vscode.commands.executeCommand('workbench.view.extension.chat-my-lovely-cat-view');
        });
        context.subscriptions.push(askDespose);

        // 打开设置
        const settingsDepose = vscode.commands.registerCommand('my-lovely-cat.settings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', '@my-lovely-cat.model-token');
        });
        context.subscriptions.push(settingsDepose);

        // 打开代理
        const agentDepose = vscode.commands.registerCommand('my-lovely-cat-agent.open', () => {
            vscode.commands.executeCommand('workbench.view.extension.chat-my-lovely-cat-agent');
        });
        context.subscriptions.push(agentDepose);

        // 配置token
        const setTokenDepose = vscode.commands.registerCommand('my-lovely-cat.setToken', async () => {
            const db = new ConfigDa(context);
            const token = await vscode.window.showInputBox({
                title: `请输入【${db.data.model.platform}】API令牌token`,
            });
            if (token) {
                
                db.setToken(token);
            }
        });
        context.subscriptions.push(setTokenDepose);

    }

}