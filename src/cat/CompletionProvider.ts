import * as vscode from 'vscode';
import { DeepseekModel } from './DeepseekModel';

export class CompletionProvider implements vscode.CompletionItemProvider {
    private context: vscode.ExtensionContext;
    private model: DeepseekModel;
    private keywords = 'cat';
    private triggerCharacter = '?';
    private grenrating = false;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.model = new DeepseekModel();
        this.model.initConfig(context);
    }
    static init(context: vscode.ExtensionContext) {
        const provider = new CompletionProvider(context);
        const doc = { scheme: "file" };
        const depose = vscode.languages.registerCompletionItemProvider(doc, provider, provider.triggerCharacter);
        context.subscriptions.push(depose);

        console.log('注册小喵喵补全')
    }
    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {

        const line = document.lineAt(position).text;
        const prompt = line.replace(this.keywords + this.triggerCharacter, '').replaceAll(/[\\#\*]/g, '')

        if (!line.endsWith(this.keywords + this.triggerCharacter)) {
            return [];
        }

        if(this.grenrating){
            return [];
        }

        this.grenrating = true;

        const text = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在生成代码...",
            cancellable: false
        }, () => {

            return this.model.genrateCode(`编程语言：${document.languageId}，${prompt}`);
        });
        const item = this.createCompletionItem(prompt,text);
        this.grenrating = false;
        return [item];

    }

    private createCompletionItem(prompt: string,text:string): vscode.CompletionItem {
        const item = new vscode.CompletionItem('已生成代码', vscode.CompletionItemKind.Text);
        item.insertText = '\n' + text.replaceAll(/\`{3}(\w+)?/g,'');
        item.detail = 'Tab/Enter插入此代码';
        item.documentation = new vscode.MarkdownString(text);
        return item;
    }

}