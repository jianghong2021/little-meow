import * as vscode from 'vscode';
import { AiModel } from './AiModel';
import { ConfigDa } from '../data/ConfigDb';

export class CatParticipant {
    public static ID = 'my-cat';
    public static model = new AiModel();
    public static config: ConfigDa;
    public static init(context: vscode.ExtensionContext) {
        this.model.initConfig(context,'code');
        this.config = new ConfigDa(context);
        const cat = vscode.chat.createChatParticipant(this.ID, this.handler.bind(this));
        cat.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets/icons/logo.svg');
    }

    public static async handler(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<any> {
        stream.progress('Thinking...');
        try {
            const res = await this.model.chat(this.config.data.codeModel.name, request.prompt);
            stream.markdown(res);
        } catch (err: any) {
            stream.markdown(err.message || 'unknown error');
        }
        return request;
    }
}