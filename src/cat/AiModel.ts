import * as vscode from 'vscode';
import { ConfigDa } from '../data/ConfigDb';
import { DeepseekModel } from './models/DeepseekModel';
import { ClaudeModel } from './models/ClaudeModel';
import { ChatGptModel } from './models/ChatGptModel';
import { DoubaoModel } from './models/DoubaoModel';
import { OpenAiModel } from './models/OpenAiModel';

export class AiModel implements AiCommModel {
    private API_TOKEN = '';
    public MAX_CONTEXT_SIZE = 127 * 1024 * 0.85;
    public model?: AiCommModel;
    private lastGetAccount = 0;

    private getModelForPlatform(config: ConfigDa, platform: ModePlatform, modelName: string): AiCommModel {
        if (platform === 'deepseek') {
            return new DeepseekModel(this.API_TOKEN) as any;
        }
        if (platform === 'claude') {
            return new ClaudeModel(this.API_TOKEN) as any;
        }
        if (platform === 'gpt') {
            return new ChatGptModel(this.API_TOKEN) as any;
        }
        if (platform === 'volcengine') {
            return new DoubaoModel(this.API_TOKEN) as any;
        }
        if (platform === 'openai') {
            const baseUrl = config.getBaseUrl('openai');
            return new OpenAiModel(this.API_TOKEN, baseUrl, modelName) as any;
        }
        const provider = config.getProviderByPlatform(platform);
        if (provider) {
            return new OpenAiModel(this.API_TOKEN, provider.baseUrl, modelName) as any;
        }
        throw Error(`Unknown platform: ${platform}`);
    }

    /**初始化模型 */
    public async initConfig(context: vscode.ExtensionContext, modalType: ChatConfigModeType) {
        const config = new ConfigDa(context);
        this.API_TOKEN = (await config.getToken(modalType)) || '';

        const platform = modalType === 'chat'
            ? config.data.chatModel.platform
            : config.data.codeModel.platform;

        const modelName = modalType === 'chat'
            ? config.data.chatModel.name
            : config.data.codeModel.name;

        this.model = this.getModelForPlatform(config, platform, modelName);

        this.MAX_CONTEXT_SIZE = this.model?.MAX_CONTEXT_SIZE || 0;

        this.getAccountBalance();
    }

    public chat(model: string, prompt: string, snippet = '', memory?: GeneralMessage[]) {
        if (!this.model) {
            throw Error('Model not initialized');
        }
        return this.model.chat(model, prompt, snippet, memory);
    }

    async sseChat(model: string, prompt: string, snippet?: string, memory?: GeneralMessage[], thinking = false, onMsg?: (msg: SseGeneralMessage) => void) {
        if (!this.model) {
            throw Error('Model not initialized');
        }

        await this.model.sseChat(model, prompt, snippet, memory, thinking, onMsg);
    }

    public code(prompt: string) {
        if (!this.model) {
            throw Error('Model not initialized');
        }

        return this.model.code(prompt);
    }

    public agent(prompt: string, source?: string) {
        if (!this.model) {
            throw Error('Model not initialized');
        }

        return this.model.agent(prompt, source);
    }

    public async getAccountBalance() {
        const now = Date.now();
        if (this.lastGetAccount > 0 && now - this.lastGetAccount < 5_000) {
            return;
        }
        this.lastGetAccount = now;
        this.model?.getAccountBalance();
    }
}