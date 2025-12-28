import * as vscode from 'vscode';
import { ConfigDa } from '../data/ConfigDb';
import { DeepseekModel } from './models/DeepseekModel';
import { ClaudeModel } from './models/ClaudeModel';
import { ChatGptModel } from './models/ChatGptModel';
import { DoubaoModel } from './models/DoubaoModel';

export class AiModel implements AiCommModel {
    private API_TOKEN = '';
    private lastCheck = 0;
    public MAX_CONTEXT_SIZE = 127 * 1024 * 0.85;
    public model?: AiCommModel;
    private lastGetAccount = 0;

    public async initConfig(context: vscode.ExtensionContext) {
        const now = Date.now();
        if (this.API_TOKEN && this.lastCheck > 0 && now - this.lastCheck < 1000 * 15) {
            return;
        }
        this.lastCheck = now;
        const config = new ConfigDa(context);
        this.API_TOKEN = (await config.getToken()) || '';

        if (config.data.model.platform === 'deepseek') {
            this.model = new DeepseekModel(this.API_TOKEN) as any;
        } else if (config.data.model.platform === 'claude') {
            this.model = new ClaudeModel(this.API_TOKEN) as any;
        } else if (config.data.model.platform === 'gpt') {
            this.model = new ChatGptModel(this.API_TOKEN) as any;
        } else if (config.data.model.platform === 'doubao') {
            this.model = new DoubaoModel(this.API_TOKEN) as any;
        }

        this.MAX_CONTEXT_SIZE = this.model?.MAX_CONTEXT_SIZE || 0;

        this.getAccountBalance();
    }

    public chat(model: ChatModelId,prompt: string, snippet = '', memory?:GeneralMessage[]) {
        if (!this.model) {
            throw Error('Model not initialized');
        }
        return this.model.chat(model,prompt, snippet, memory);
    }

    async sseChat(model: ChatModelId,prompt: string, snippet?: string, memory?: GeneralMessage[],thinking=false, onMsg?: (msg: SseGeneralMessage) => void) {
        if (!this.model) {
            throw Error('Model not initialized');
        }

        await this.model.sseChat(model,prompt, snippet, memory,thinking, onMsg);
    }

    public code(prompt: string) {
        if (!this.model) {
            throw Error('Model not initialized');
        }

        return this.model.code(prompt);
    }

    public agent(prompt: string,source?: string) {
        if (!this.model) {
            throw Error('Model not initialized');
        }

        return this.model.agent(prompt,source);
    }

    public async getAccountBalance(){
        const now = Date.now();
        if (this.lastGetAccount > 0 && now - this.lastGetAccount < 5_000) {
            return;
        }
        this.lastGetAccount = now;
        this.model?.getAccountBalance();
    }
}