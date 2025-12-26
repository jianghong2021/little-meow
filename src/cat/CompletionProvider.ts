import * as vscode from 'vscode';
import { AiModel } from './AiModel';

export class CompletionProvider implements vscode.InlineCompletionItemProvider {
    private context: vscode.ExtensionContext;
    private model: AiModel;
    private keywords = '@cat ';
    private grenrating = false;
    private last = 0;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.model = new AiModel();
        this.model.initConfig(context);
    }

    static init(context: vscode.ExtensionContext) {
        const provider = new CompletionProvider(context);
        const doc = { pattern: "**" };
        const depose = vscode.languages.registerInlineCompletionItemProvider(doc, provider);
        context.subscriptions.push(depose);

        console.log('注册小喵喵补全');
    }
    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ) {
        const list: vscode.InlineCompletionItem[] = [];

        const now = Date.now();
        if (this.last > 0 && now - this.last < 300) {
            return [];
        }

        this.last = now;

        if (this.grenrating) {
            return [];
        }

        const line = document.lineAt(position).text;
        const prex = line.substring(0, position.character);
        if (!prex.endsWith(this.keywords)) {
            return list;
        }

        const prompt = line.trim().replace(this.keywords, '').replaceAll(/[\/\\\#\*]/g, '');

        this.grenrating = true;

        const lang = this.getDocumentLanguage(document);
        console.log('正在生成: ',`编程语言：${lang}, ${prompt}`);
        const text = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "正在生成代码...",
            cancellable: false
        }, () => {

            return this.model.code(`编程语言：${lang}, ${prompt}`);
        });

        const item = this.createInlineCompletionItem(text, position);
        this.grenrating = false;
        list.push(item);
        return list;
    }

    private createInlineCompletionItem(text: string, position: vscode.Position): vscode.InlineCompletionItem {
        const insertText = '\n' + text.replaceAll(/\`{3}(\w+)?/g, '');
        const item = new vscode.InlineCompletionItem(insertText);
        return item;
    }

    private getDocumentLanguage(document: vscode.TextDocument) {
        if (document.languageId === 'vue') {
            const isTS = document.getText().includes('lang="ts"');
            return isTS ? 'typescript' : 'javascript';
        } else {
            return document.languageId;
        }
    }
}