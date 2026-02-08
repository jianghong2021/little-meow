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
    private docUrl?: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
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
                case 'confirmMessage':
                    this.confirmMessage(e.data);
                    break;
                case 'setModel':
                    this.setModel(e.data);
                    break;
                case 'setPlatform':
                    this.setPlatform(e.data);
                    break;
            }
        });

        //内置命令
        const clearAgentCommdDispose = vscode.commands.registerCommand('my-cat-agent.delete', this.deleteAgent.bind(this));
        const clearAllAgentCommdDispose = vscode.commands.registerCommand('my-cat-agent.clear', this.clearAgent.bind(this));

        webviewView.onDidDispose(() => {
            msgDispose.dispose();
            themeDispose.dispose();
            clearAgentCommdDispose.dispose();
            clearAllAgentCommdDispose.dispose();
        });

    }

    private getHtml(webview: vscode.Webview) {
        //基础路径
        const baseUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets'));
        const config = this.config.data;
        const workspace = this.getWorkspace();
        return `
            <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>cat-chat</title>
        <link rel="stylesheet" href="${baseUrl}/css/agent.css">
        <link rel="stylesheet" href="${baseUrl}/css/console.css">
        <link rel="stylesheet" href="${baseUrl}/css/agent-config.css">
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
                msg: ${this.msg ? JSON.stringify(this.msg) : undefined},
                workspace: '${workspace || ''}',
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

    private getWorkspace() {
        const ar = vscode.workspace.workspaceFolders;
        if (!ar) {
            return
        }
        const activeFile = vscode.window.activeTextEditor?.document.uri;
        if (activeFile) {
            const f = vscode.workspace.getWorkspaceFolder(activeFile);
            return f?.uri?.fsPath;
        }
        if (ar[0]) {
            return ar[0].uri.fsPath
        }
    }

    private deleteAgent() {
        this.webview?.webview?.postMessage({
            type: 'clearHistory',
            data: undefined
        });
    }

    private async clearAgent() {
        const res = await vscode.window.showWarningMessage(I18nUtils.t('chat.clear.all'), {
            modal: true
        }, I18nUtils.t('chat.clear.yes'));
        if (res !== undefined) {
            //删除全部聊天
            this.webview?.webview?.postMessage({
                type: 'clearAgent',
                data: undefined
            });
        }

    }

    private async setPlatform(val: string) {
        if (!val.trim()) {
            console.error('model err');
            return;
        }

        const conf = this.config.data;
        conf.codeModel.platform = val as any;
        conf.codeModel.name = this.config.defaultCodeModel?.name || 'deepseek-chat';

        await this.config.saveConfig({ ...conf });

        this.renderHtml();
    }

    private async setModel(val: string) {
        if (!val.trim()) {
            console.error('model err');
            return;
        }

        const conf = this.config.data;
        conf.codeModel.name = val as any;
        await this.config.saveConfig({ ...conf });
        this.renderHtml();
    }

    private async sendMessage(prompt: string) {
        const document = vscode.window.activeTextEditor?.document;

        this.docUrl = document?.uri;
        this.waiting = true;
        let source = document?.getText();
        await this.model.initConfig(this.context, 'code');
        if (/(创建|新建|create|new)/i.test(prompt)) {
            source = '';
        }
        this.msg = await this.model.agent(prompt, source);
        this.webview?.webview?.postMessage({
            type: 'onPutMessage',
            data: this.msg
        });
        this.waiting = false;

        vscode.commands.executeCommand('my-cat-agent.open');
    }

    private getStatus() {
        const status: AgentStatus = {
            msg: this.msg,
            waiting: this.waiting,
        }
        this.webview?.webview?.postMessage({
            type: 'onStatus',
            data: status
        });
    }

    private async confirmMessage(msg: AgentMessage) {
        if (this.docUrl) {
            msg.instruction = 'editDocument';
        }
        switch (msg.instruction) {
            case 'editDocument':
                await this.editDocument(msg);
                break
            case 'createDocument':
                await this.createDocument(msg);
                break
        }
        this.msg = undefined;
    }

    private async editDocument(msg: AgentMessage) {
        const document = vscode.window.activeTextEditor?.document;
        if (!document || !this.docUrl) {
            const msg: AgentMessage = {
                content: '',
                description: '',
                instruction: 'editDocument',
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
                    description: '',
                    instruction: 'editDocument',
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

    }

    private async createDocument(msg: AgentMessage) {
        const doc = await vscode.workspace.openTextDocument({
            content: msg.content
        })
        vscode.window.showTextDocument(doc);
    }
}