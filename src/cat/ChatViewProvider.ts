import * as vscode from 'vscode';
import { AiModel } from './AiModel';
import { ConversationDb } from '../data/ConversationData';
import { formatTimeAgo } from '../utils/date';
import { ConfigDa } from '../data/ConfigDb';
import { I18nUtils } from '../utils/i18n';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    static VIEW_ID = 'chatView';
    private context: vscode.ExtensionContext;
    public projects: ChatDetails[] = [];
    public webview?: vscode.WebviewView;
    public model = new AiModel();
    public config: ConfigDa;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.config = new ConfigDa(context);
    }
    static register(context: vscode.ExtensionContext) {
        const provider = new ChatViewProvider(context);
        const disposable = vscode.window.registerWebviewViewProvider(this.VIEW_ID, provider);
        context.subscriptions.push(disposable);
    }
    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
        webviewView.webview.options = {
            enableScripts: true
        };
        this.webview = webviewView;

        webviewView.webview.html = this.getHtml(webviewView.webview);

        const msgDispose = webviewView.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'sendMessage':
                    this.sendMessage(e.data);
                    break;
                case 'setChatMode':
                    this.setChatMode();
                    break;
                case 'setModel':
                    this.setModel(e.data);
                    break;
                case 'setPlatform':
                    this.setPlatform(e.data);
                    break;
                case 'setChatThinking':
                    this.setChatThinking();
                    break;
                case 'reload':
                    this.renderHtml();
                    break;
            }
        });

        const editorDispose = vscode.window.onDidChangeActiveTextEditor((event) => {
            this.webview?.webview?.postMessage({
                type: 'onDocumentChange',
                data: event?.document.fileName
            });
        });

        const themeDispose = vscode.window.onDidChangeActiveColorTheme((evnt) => {
            webviewView.webview.html = this.getHtml(webviewView.webview);
        });

        //内置命令
        const clearCommdDispose = vscode.commands.registerCommand('my-cat.clear', this.clearHistory.bind(this));
        const clearAllCommdDispose = vscode.commands.registerCommand('my-cat.clearAll', this.clearAllHistory.bind(this));
        const historyCommdDispose = vscode.commands.registerCommand('my-cat.history', this.openHistory.bind(this));
        const newChatCommdDispose = vscode.commands.registerCommand('my-cat.new', this.newChat.bind(this));

        webviewView.onDidDispose(() => {
            msgDispose.dispose();
            themeDispose.dispose();
            clearCommdDispose.dispose();
            clearAllCommdDispose.dispose();
            editorDispose.dispose();
            newChatCommdDispose.dispose();
            historyCommdDispose.dispose();
        });

    }

    private setChatMode() {
        const db = new ConversationDb(this.context);
        const conv = this.getConversation();
        if (conv.mode !== 'code') {
            conv.mode = 'code';
        } else {
            conv.mode = 'norm';
        }
        db.update(conv.id, conv);
        this.renderHtml();
    }

    private async setChatThinking() {

        const conf = this.config.data;
        conf.thinking = !conf.thinking;

        await this.config.saveConfig({ ...conf });
        this.renderHtml();
    }

    private async setPlatform(val: string) {
        if (!val.trim()) {
            console.error('model err');
            return;
        }

        const conf = this.config.data;
        conf.model.platform = val as any;
        conf.model.name = this.config.defaultModel?.name || 'deepseek-chat';
        
        await this.config.saveConfig({ ...conf });

        this.renderHtml();
    }

    private async setModel(val: string) {
        if (!val.trim()) {
            console.error('model err');
            return;
        }

        const conf = this.config.data;
        conf.model.name = val as any;
        await this.config.saveConfig({ ...conf });
        this.renderHtml();
    }

    private async clearHistory() {
        const res = await vscode.window.showWarningMessage(I18nUtils.t('chat.clear.current'), {
            modal: true
        }, I18nUtils.t('chat.clear.yes'));
        if (res !== undefined) {
            //删除当前聊天
            const db = new ConversationDb(this.context);
            const conv = this.getConversation();
            db.remove(conv.id);
            this.webview?.webview?.postMessage({
                type: 'clearHistory',
                data: this.getConversation()
            });
        }
    }

    private async clearAllHistory() {
        const res = await vscode.window.showWarningMessage(I18nUtils.t('chat.clear.all'), {
            modal: true
        }, I18nUtils.t('chat.clear.yes'));
        if (res !== undefined) {
            //删除全部聊天
            const db = new ConversationDb(this.context);
            db.removeAll();
            this.webview?.webview?.postMessage({
                type: 'clearAllHistory',
                data: this.getConversation()
            });
        }
    }

    private openHistory() {
        const db = new ConversationDb(this.context);
        const quickPick = vscode.window.createQuickPick();

        const data = db.getAll();

        quickPick.items = data.map(x => {
            return {
                label: x.title,
                description: formatTimeAgo(x.date),
                detail: x.id
            };
        });

        quickPick.onDidChangeSelection(selection => {
            if (selection[0]) {
                const selected = data.find(x => x.id === selection[0].detail);
                if (selected) {
                    db.setActive(selected.id);
                    this.renderHtml();
                    console.log('选择聊天', selected.title);
                }

                quickPick.hide();
            }
        });

        quickPick.onDidHide(() => quickPick.dispose());

        quickPick.show();
    }

    private renderHtml() {
        if (this.webview) {
            this.webview.webview.html = this.getHtml(this.webview.webview);
        }
    }

    private newChat() {
        const db = new ConversationDb(this.context);
        db.new();
        this.renderHtml();
        console.log('new chat');
    }

    private async sendMessage(req: MessageSendArg) {
        const { prompt, memory, data } = req;

        const msg: ChatDetails = {
            ...data,
            status: 'waiting'
        };

        const db = new ConversationDb(this.context);
        const conv = db.one(msg.conversationId);
        if (!conv) {
            msg.content = '会话不存在!';
            msg.status = 'ended';
            this.webview?.webview?.postMessage({
                type: 'onPutMessage',
                data: msg
            });
            return;
        }
        //合并当前打开文档
        let activeFile = '';
        if (conv.mode === 'code' && vscode.window.activeTextEditor?.document) {
            activeFile = '用户源码片段：';
            for (const range of vscode.window.activeTextEditor.visibleRanges) {
                if (range.isEmpty) {
                    continue;
                }
                activeFile += vscode.window.activeTextEditor.document.getText(range).trim();

                const textEncoder = new TextEncoder();
                if (textEncoder.encode(activeFile).length >= this.model.MAX_CONTEXT_SIZE) {
                    break;
                }
            }

        }

        // 与模型交互
        await this.model.initConfig(this.context);
        msg.title = prompt.substring(0, 16);
        msg.content = "";
        msg.reasoningContent = '';

        //更新会话标题
        conv.title = prompt;
        db.update(msg.conversationId, conv);

        const modalMemory = memory.map(x => {
            const m: GeneralMessage = {
                role: x.role,
                content: x.content
            }
            return m
        })
        this.model.sseChat(this.config.data.model.name, prompt, activeFile, modalMemory, this.config.data.thinking, data => {
            const answer: ChatDetails = {
                ...msg,
                content: data.content || '',
                reasoningContent: data.reasoningContent
            };
            answer.status = 'answering';
            this.webview?.webview?.postMessage({
                type: 'onAnswer',
                data: answer
            });
        }).then(() => {
            msg.status = 'ended';
            this.webview?.webview?.postMessage({
                type: 'onPutMessage',
                data: msg
            });
        }).catch(err => {
            msg.status = 'ended';
            msg.content = err.message || 'unknown error';
            this.webview?.webview?.postMessage({
                type: 'onPutMessage',
                data: msg
            });
            console.error(err)
        });
    }

    private getActiveFile() {
        if (!vscode.window.activeTextEditor?.document.fileName) {
            return '';
        }
        const fileName = vscode.window.activeTextEditor.document.fileName.replaceAll(/\\/g, '/');
        if (fileName.endsWith('\\')) {
            return fileName.substring(0, fileName.length - 1);
        } else {
            return fileName;
        }
    }

    private getConversation() {
        const db = new ConversationDb(this.context);
        const res = db.latestOrSelected();
        if (res) {
            return res;
        }
        const conv: ConversationDetails = {
            id: '',
            title: 'New Conversation',
            date: Date.now(),
            selected: true,
            mode: 'code'
        };

        return db.insert(conv);
    }

    private getHtml(webview: vscode.Webview) {

        let codeCssUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets/css/code.css'));
        if (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark) {
            codeCssUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets/css/code-dark.css'));
        }

        //基础路径
        const baseUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets'));
        const conversation = this.getConversation();

        const config = this.config.data;

        return `
        <!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>cat-chat</title>
    <link rel="stylesheet" href="${codeCssUrl}">
    <link rel="stylesheet" href="${baseUrl}/css/chat.css">
</head>
<body>
    <div id="app"></div>
    <script>
        window.initConfig = {
            baseUrl: "${baseUrl}",
            isDark: ${vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark},
            activeDocument: "${this.getActiveFile()}",
            conversation: ${JSON.stringify(conversation)},
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
        document.addEventListener("contextmenu", (event) => {
                event.preventDefault();
            })
    </script>
    <script src="${baseUrl}/js/chat-cont.js"></script>
</body>
</html>
        `;
    }
}