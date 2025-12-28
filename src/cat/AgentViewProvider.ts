import * as vscode from 'vscode';
import { AiModel } from './AiModel';
import { ConfigDa } from '../data/ConfigDb';
import { I18nUtils } from '../utils/i18n';

export class AgentViewProvider implements vscode.WebviewViewProvider {
    static VIEW_ID = 'my-lovely-cat-agent';
    private context: vscode.ExtensionContext;
    public webview?: vscode.WebviewView;
    public model = new AiModel();
    public config: ConfigDa;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.config = new ConfigDa(context);
    }
    static register(context: vscode.ExtensionContext) {
        const provider = new AgentViewProvider(context);
        const disposable = vscode.window.registerWebviewViewProvider(this.VIEW_ID, provider);
        context.subscriptions.push(disposable);
    }

    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
        webviewView.webview.options = {
            enableScripts: true
        };
        this.webview = webviewView;

        webviewView.webview.html = this.getHtml(webviewView.webview);

        const themeDispose = vscode.window.onDidChangeActiveColorTheme((evnt) => {
            webviewView.webview.html = this.getHtml(webviewView.webview);
        });

        const msgDispose = webviewView.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'sendMessage':
                    this.sendMessage(e.data);
                    break;
                case 'reload':
                    this.renderHtml();
                    break;
                case 'confirmMessage':
                    this.confirmMessage(e.data);
            }
        });

        webviewView.onDidDispose(() => {
            msgDispose.dispose();
            themeDispose.dispose();
        });
    }

    private getHtml(webview: vscode.Webview) {

        //基础路径
        const baseUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets'));

        const config = this.config.data;

        return `
            <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>cat-chat</title>
        <link rel="stylesheet" href="${baseUrl}/css/agent.css">
    </head>
    <body>
        <div id="app"></div>
        <script>
            window.initConfig = {
                baseUrl: "${baseUrl}",
                isDark: ${vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark},
                platforms: ${JSON.stringify(this.config.platforms)},
                models: ${JSON.stringify(this.config.models)},
                config: ${JSON.stringify(config)},
            }
            window.I18nUtils = {
                messages: ${JSON.stringify(I18nUtils.messages)},
                t(key, fallback) {
                    return window.I18nUtils.messages[key] ?? fallback ?? key;
                }
            }
        </script>
        <script src="${baseUrl}/js/agent-cont.js"></script>
    </body>
    </html>
            `;
    }

    private renderHtml() {
        if (this.webview) {
            this.webview.webview.html = this.getHtml(this.webview.webview);
        }
    }

    private async sendMessage(prompt: string) {
        const document = vscode.window.activeTextEditor?.document;
        if (!document) {
            const msg: AgentMessage = {
                content: '',
                compare: '',
                error: I18nUtils.t('agent.not_activeDocument')
            }
            this.webview?.webview?.postMessage({
                type: 'onPutMessage',
                data: msg
            });
            return
        }
        const source = document.getText();
        await this.model.initConfig(this.context);
        const msg = await this.model.agent(prompt, source);
        this.webview?.webview?.postMessage({
            type: 'onPutMessage',
            data: msg
        });
    }

    private async confirmMessage(msg: AgentMessage) {
        const document = vscode.window.activeTextEditor?.document;
        if (!document) {
            const msg: AgentMessage = {
                content: '',
                compare: '',
                error: I18nUtils.t('agent.not_activeDocument')
            }
            this.webview?.webview?.postMessage({
                type: 'onPutMessage',
                data: msg
            });
            return
        }
        vscode.window.activeTextEditor?.edit(editor => {
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            editor.replace(fullRange, msg.content);
        })
    }
}