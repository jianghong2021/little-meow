import * as vscode from 'vscode';
import { ConfigDa } from '../data/ConfigDb';

export class CatCommand {
    public static init(context: vscode.ExtensionContext) {
        // 聊天参与者
        const askDespose = vscode.commands.registerCommand('my-cat.ask', () => {
            vscode.commands.executeCommand('workbench.view.extension.my-cat.chat');
        });
        context.subscriptions.push(askDespose);

        // 打开设置
        const settingsDepose = vscode.commands.registerCommand('my-cat.settings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', '@my-cat.model-token');
        });
        context.subscriptions.push(settingsDepose);

        // 打开代理
        const agentDepose = vscode.commands.registerCommand('my-cat-agent.open', () => {
            vscode.commands.executeCommand('workbench.view.extension.my-cat-agent');
        });
        context.subscriptions.push(agentDepose);

        // 配置deepseek token
        const setDeepseekTokenDepose = vscode.commands.registerCommand('my-cat.setToken.deepseek', async () => {
            const db = new ConfigDa(context);
            const token = await vscode.window.showInputBox({
                title: `请输入【Deepseek】API令牌token`,
            });
            if (token) {
                db.setToken(token, 'deepseek');
            }
        });
        context.subscriptions.push(setDeepseekTokenDepose);

        // 配置 volcengine token
        const setVolcengineTokenDepose = vscode.commands.registerCommand('my-cat.setToken.volcengine', async () => {
            const db = new ConfigDa(context);
            const token = await vscode.window.showInputBox({
                title: `请输入【Volcengine】API令牌token`,
            });
            if (token) {
                db.setToken(token, 'volcengine');
            }
        });
        context.subscriptions.push(setVolcengineTokenDepose);

    }

}