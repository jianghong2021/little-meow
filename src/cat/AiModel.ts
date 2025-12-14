import * as vscode from 'vscode';
import { ConfigDa } from '../data/ConfigDb';
import { DeepseekModel } from './models/DeepseekModel';
import { ClaudeModel } from './models/ClaudeModel';
import { ChatGptModel } from './models/ChatGptModel';

export class AiModel {
    private API_TOKEN = '';
    private lastCheck = 0;
    public MAX_CONTEXT_SIZE = 127 * 1024 * 0.85;
    public model?: AiCommModel;

    public async initConfig(context: vscode.ExtensionContext) {
        const now = Date.now();
        if (this.API_TOKEN && this.lastCheck > 0 && now - this.lastCheck < 1000 * 15) {
            return
        }
        this.lastCheck = now;
        const config = new ConfigDa(context);
        this.API_TOKEN = (await config.getToken()) || '';

        if (config.data.model.type === 'deepseek') {
            this.model = new DeepseekModel(this.API_TOKEN) as any;
        } else if (config.data.model.type === 'claude') {
            this.model = new ClaudeModel(this.API_TOKEN) as any;
        } else if (config.data.model.type === 'gpt') {
            this.model = new ChatGptModel(this.API_TOKEN) as any;
        }

        this.MAX_CONTEXT_SIZE = this.model?.MAX_CONTEXT_SIZE || 0;
    }

    public chat(prompt: string, snippet = '', memory = '') {
        if (!this.model) {
            throw Error('Model not initialized')
        }
        return this.model.chat(prompt, snippet, memory);
    }

    async sseChat(prompt: string, snippet?: string, memory?: string, onMsg?: (msg: string) => void) {
        if (!this.model) {
            throw Error('Model not initialized')
        }

        await this.model.sseChat(prompt, snippet, memory, onMsg);
    }

    public code(prompt: string) {
        if (!this.model) {
            throw Error('Model not initialized')
        }

        return this.model.code(prompt);
    }
}