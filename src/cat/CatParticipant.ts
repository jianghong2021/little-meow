import * as vscode from 'vscode';
import { DeepseekModel } from './DeepseekModel';

export class CatParticipant {
    public static ID = 'chat-my-lovely-cat';
    public static model = new DeepseekModel();
    public static init(context: vscode.ExtensionContext) {
        this.model.initConfig(context);
        const cat = vscode.chat.createChatParticipant(this.ID, this.handler.bind(this));
        cat.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets/icons/logo.svg');
    }

    public static async handler(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<ICatChatResult> {
        stream.progress('Thinking...');
        const res = await this.model.sendMsg(request.prompt)
        stream.markdown(res);
        return request
    }
}