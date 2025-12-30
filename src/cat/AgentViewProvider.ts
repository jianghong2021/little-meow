import * as vscode from 'vscode';
import { AiModel } from './AiModel';
import { ConfigDa } from '../data/ConfigDb';
import { I18nUtils } from '../utils/i18n';
import { AgentMsgDbs } from '../data/AgentMsgDb';

export class AgentViewProvider implements vscode.WebviewViewProvider {
    static VIEW_ID = 'agentView';
    private context: vscode.ExtensionContext;
    public webview?: vscode.WebviewView;
    public model = new AiModel();
    public config: ConfigDa;
    private msg?: AgentMessage;
    private waiting = false;
    private db: AgentMsgDbs;
    private docUrl?: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.db = new AgentMsgDbs(context);
        this.config = new ConfigDa(context);
    }
    static register(context: vscode.ExtensionContext) {
        const provider = new AgentViewProvider(context);
        const disposable = vscode.window.registerWebviewViewProvider(this.VIEW_ID, provider);
        context.subscriptions.push(disposable);
        console.log('注册小喵喵代理')
    }

    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
        webviewView.webview.options = {
            enableScripts: true,

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
                case 'getStatus':
                    this.getStatus();
                    break;
                case 'inserHistory':
                    this.inserHistory(e.data);
                    break;
                case 'clearHistory':
                    this.clearHistory();
                    break;
                case 'confirmMessage':
                    this.confirmMessage(e.data);
                    break;
            }
        });

        //内置命令
        const clearAgentCommdDispose = vscode.commands.registerCommand('my-cat-agent.clear', this.clearAgent.bind(this));

        webviewView.onDidDispose(() => {
            msgDispose.dispose();
            themeDispose.dispose();
            clearAgentCommdDispose.dispose();
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
        <link rel="stylesheet" href="${baseUrl}/css/console.css">
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
                msg: ${this.msg ? JSON.stringify(this.msg) : undefined}
            }
            window.I18nUtils = {
                messages: ${JSON.stringify(I18nUtils.messages)},
                t(key, fallback) {
                    return window.I18nUtils.messages[key] ?? fallback ?? key;
                }
            }
            document.addEventListener("contextmenu", (event) => {
                event.preventDefault();
            })
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

    private clearAgent() {
        this.clearHistory();
        this.webview?.webview?.postMessage({
            type: 'clearHistory',
            data: undefined
        });
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
        this.docUrl = document.uri;
        this.waiting = true;
        const source = document.getText();
        await this.model.initConfig(this.context);
        this.msg = await this.model.agent(prompt, source);
        this.webview?.webview?.postMessage({
            type: 'onPutMessage',
            data: this.msg
        });
        this.waiting = false;

        vscode.commands.executeCommand('my-cat-agent.open');
    }

    private getStatus() {
        const status: AgetnStatus = {
            msg: this.msg,
            waiting: this.waiting,
            history: this.db.getAll()
        }
        this.webview?.webview?.postMessage({
            type: 'onStatus',
            data: status
        });
    }

    private inserHistory(msg: ConsoleMessage) {
        this.db.insert(msg);
    }

    private clearHistory() {
        this.db.clear();
    }

    private async confirmMessage(msg: AgentMessage) {
        const document = vscode.window.activeTextEditor?.document;
        if (!document || !this.docUrl) {
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
        if (document.uri.fsPath !== this.docUrl?.fsPath) {
            const docs = vscode.workspace.textDocuments;
            let ok = false;
            for (const doc of docs) {
                if (doc.uri.fsPath === this.docUrl.fsPath) {
                    ok = true;
                    await vscode.window.showTextDocument(doc);
                    break
                }
            }

            if (!ok) {
                const msg: AgentMessage = {
                    content: '',
                    compare: '',
                    error: I18nUtils.t('agent.doc_is_closed')
                }
                this.webview?.webview?.postMessage({
                    type: 'onPutMessage',
                    data: msg
                });
                return
            }
        }

        this.docUrl = undefined;
        vscode.window.activeTextEditor?.edit(editor => {
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            editor.replace(fullRange, msg.content);
        });

        this.msg = undefined;
    }
}