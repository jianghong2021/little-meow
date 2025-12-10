import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { DeepseekModel } from './DeepseekModel';
import { ConversationDb } from '../data/ConversationData';
import { formatTimeAgo } from '../utils/date';

const localize = nls.loadMessageBundle();

export class ChatViewProvider implements vscode.WebviewViewProvider {
    static VIEW_ID = 'my-lovely-cat-view'
    private context: vscode.ExtensionContext
    public projects: ChatDetails[] = []
    public webview?: vscode.WebviewView
    public model = new DeepseekModel();
    constructor(context: vscode.ExtensionContext) {
        this.context = context
    }
    static register(context: vscode.ExtensionContext) {
        const provider = new ChatViewProvider(context)
        const disposable = vscode.window.registerWebviewViewProvider(this.VIEW_ID, provider)
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
                    this.sendMessage(e.data)
                    break
                case 'setChatMode':
                    this.setChatMode()
                    break
                case 'reload':
                    this.renderHtml();
                    break
            }
        })

        webviewView.title = localize('view.chat.settings', 'hello')

        const editorDispose = vscode.window.onDidChangeActiveTextEditor((event) => {
            this.webview?.webview?.postMessage({
                type: 'onDocumentChange',
                data: event?.document.fileName
            })
        })

        const themeDispose = vscode.window.onDidChangeActiveColorTheme((evnt) => {
            webviewView.webview.html = this.getHtml(webviewView.webview);
        })

        //内置命令
        const clearCommdDispose = vscode.commands.registerCommand('my-lovely-cat.clear', this.clearHistory.bind(this));
        const historyCommdDispose = vscode.commands.registerCommand('my-lovely-cat.history', this.openHistory.bind(this));
        const newChatCommdDispose = vscode.commands.registerCommand('my-lovely-cat.new', this.newChat.bind(this));

        webviewView.onDidDispose(() => {
            msgDispose.dispose();
            themeDispose.dispose();
            clearCommdDispose.dispose();
            editorDispose.dispose();
            newChatCommdDispose.dispose();
            historyCommdDispose.dispose();
        })

    }

    private setChatMode() {
        const db = new ConversationDb(this.context);
        const conv = this.getConversation();
        if (conv.mode != 'code') {
            conv.mode = 'code';
        } else {
            conv.mode = 'norm';
        }
        db.update(conv.id, conv);
        this.renderHtml();
    }

    private async clearHistory() {
        const res = await vscode.window.showWarningMessage(localize('view.chat.clear', 'Clear Chat History'), {
            modal: true
        }, 'Yes')
        if (res !== undefined) {
            //删除当前聊天
            const db = new ConversationDb(this.context);
            const conv = this.getConversation();
            db.remove(conv.id);
            this.webview?.webview?.postMessage({
                type: 'clearHistory',
                data: this.getConversation()
            })
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
            }
        })

        quickPick.onDidChangeSelection(selection => {
            if (selection[0]) {
                const selected = data.find(x => x.id == selection[0].detail);
                if (selected) {
                    db.setActive(selected.id);
                    this.renderHtml();
                    console.log('选择聊天', selected.title)
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
        console.log('new chat')
    }

    private async sendMessage(req: MessageSendArg) {
        const { prompt, memory, data } = req;

        const msg: ChatDetails = {
            ...data,
            done: true
        }

        const db = new ConversationDb(this.context);
        const conv = db.one(msg.conversationId);
        if (!conv) {
            msg.content = '会话不存在!';
            this.webview?.webview?.postMessage({
                type: 'onPutMessage',
                data: msg
            })
            return
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
        const stream = await this.model.requestSSE(prompt, activeFile, memory);
        msg.title = prompt.substring(0, 16);
        msg.content = "";

        //更新会话标题
        conv.title = prompt;
        db.update(msg.conversationId, conv);

        //返回消息
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await stream.read();
            if (done) {
                break
            }
            const chunk = decoder.decode(value).trim();
            if (chunk.includes('[DONE]')) {
                break
            }
            if (chunk == '') {
                continue
            }
            const ar = chunk.split('\n');
            for (const s of ar) {
                if (s.trim() == '') {
                    continue
                }
                const line = s.replace(/data\:\s?/i, '');
                const data: ChatResponse = JSON.parse(line);
                if (!data.choices[0]) {
                    continue
                }
                const answer:ChatDetails = {
                    ...msg,
                    content: data.choices[0].delta.content
                }
                
                this.webview?.webview?.postMessage({
                    type: 'onAnswer',
                    data: answer
                })
            }

        }

        this.webview?.webview?.postMessage({
            type: 'onPutMessage',
            data: msg
        })
    }

    private getActiveFile() {
        if (!vscode.window.activeTextEditor?.document.fileName) {
            return ''
        }
        const fileName = vscode.window.activeTextEditor.document.fileName.replaceAll(/\\/g, '/');
        if (fileName.endsWith('\\')) {
            return fileName.substring(0, fileName.length - 1)
        } else {
            return fileName;
        }
    }

    private getConversation() {
        const db = new ConversationDb(this.context);
        const res = db.latestOrSelected();
        if (res) {
            return res
        }
        const conv: ConversationDetails = {
            id: '',
            title: 'New Conversation',
            date: Date.now(),
            selected: true,
            mode: 'code'
        }

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

        const modeIcon = conversation.mode == 'code' ? 'checked' : 'check';

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
    <div class="chat-container">
        <div class="chat-messages" id="chat-messages">
            <div class="message ai">
                您好！我是您的AI助手，有什么可以帮您的吗？
                <div class="message-time">刚刚</div>
            </div>
        </div>
        
        <div class="chat-input-container">
            <div id="activeDocument" data-mode="${conversation.mode}">
                <span></span>
                <img onclick="setChatMode()" src="${baseUrl}/icons/ic-${modeIcon}.svg"/>
            </div>
            <input type="text" id="message-input" placeholder="输入消息..." autocomplete="off">
            <button id="send-button" disabled>
                <img src="${baseUrl}/icons/send.svg"/>
            </button>
        </div>
    </div>
    <script>
        window.initConfig = {
            baseUrl: "${baseUrl}",
            isDark: ${vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark},
            activeDocument: "${this.getActiveFile()}",
            conversation: ${JSON.stringify(conversation)}
        }
    </script>
    <script src="${baseUrl}/js/chat-cont.js"></script>
</body>
</html>
        `
    }
}