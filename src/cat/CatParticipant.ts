import * as vscode from 'vscode';
import { AiModel } from './AiModel';

export class CatParticipant {
    public static ID = 'chat-my-lovely-cat';
    public static model = new AiModel();
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
        try {
            const res = await this.model.chat(request.prompt);
            stream.markdown(res);
        } catch (err: any) {
            stream.markdown(err.message || 'unknown error');
        }
        return request
    }
}