import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { DeepseekModel } from './DeepseekModel';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

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

        return {
            disposable,
            provider
        }
    }
    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
        webviewView.webview.options = {
            enableScripts: true
        };
        this.webview = webviewView;
        const message = {
            openFolder: localize('view.open.folder', 'Open Folder'),
        }
        webviewView.webview.html = this.getHtml(webviewView.webview, message);

        const msgDispose = webviewView.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'sendMessage':
                    this.sendMessage(e.data)
                    break
                case 'removeFolder':
                    break
            }
        })

        const editorDispose = vscode.window.onDidChangeActiveTextEditor((event) => {
            this.webview?.webview?.postMessage({
                type: 'onDocumentChange',
                data: event?.document.fileName
            })
        })

        const themeDispose = vscode.window.onDidChangeActiveColorTheme((evnt) => {
            webviewView.webview.html = this.getHtml(webviewView.webview, message);
        })

        const commdDispose = vscode.commands.registerCommand('my-lovely-cat.clear', async () => {

            const res = await vscode.window.showWarningMessage(localize('view.chat.clear', 'Clear Chat History'), {
                modal: true
            }, 'Yes')
            if (res !== undefined) {
                this.webview?.webview?.postMessage({
                    type: 'clearHistory',
                    data: undefined
                })
                console.log('clearHistory')
            }
        });

        webviewView.onDidDispose(() => {
            msgDispose.dispose();
            themeDispose.dispose();
            commdDispose.dispose();
            editorDispose.dispose();
        })

    }

    private async sendMessage(req: any) {
        const { prompt, id, fid } = req;

        //合并当前打开文档
        let activeFile = '';
        if(vscode.window.activeTextEditor?.document){
            activeFile = '用户源码片段：';
            for(const range of vscode.window.activeTextEditor.visibleRanges){
                if(range.isEmpty){
                    continue;
                }
                activeFile += vscode.window.activeTextEditor.document.getText(range).trim();

                if(activeFile.length>=500){
                    break;
                }
            }
            
        }

        const res = await this.model.sendMsg(prompt,activeFile)
        const data: ChatDetails = {
            id,
            title: res.substring(0, 16),
            content: `${res}`,
            done: true,
            date: Date.now(),
            role: 'ai',
            fid
        }
        this.webview?.webview?.postMessage({
            type: 'onPutMessage',
            data
        })
    }

    private getActiveFile(){
        if(!vscode.window.activeTextEditor?.document.fileName){
            return ''
        }
        const fileName = vscode.window.activeTextEditor.document.fileName.replaceAll(/\\/g,'/');
        if(fileName.endsWith('\\')){
            return fileName.substring(0,fileName.length-1)
        }else{
            return fileName;
        }
    }

    private getHtml(webview: vscode.Webview, message: { [k: string]: string }) {
        const cssUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets/chat.css'));

        const sendIconUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets/send.svg'));
        const jsUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets/chat-cont.js'));

        let codeCssUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets/code.css'));
        if (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark) {
            codeCssUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets/code-dark.css'));
        }

        const baseUrl = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets'))

        return `
        <!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>cat-chat</title>
    <link rel="stylesheet" href="${codeCssUrl}">
    <link rel="stylesheet" href="${cssUrl}">
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
            <div id="activeDocument"></div>
            <input type="text" id="message-input" placeholder="输入消息..." autocomplete="off">
            <button id="send-button" disabled>
                <img src="${sendIconUrl}"/>
            </button>
        </div>
    </div>
    <script>
        window.initConfig = {
            baseUrl: "${baseUrl}",
            isDark: ${vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark},
            activeDocument: "${this.getActiveFile()}"
        }
    </script>
    <script src="${jsUrl}"></script>
</body>
</html>
        `
    }
}