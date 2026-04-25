import * as vscode from 'vscode';
import { I18nUtils } from '../utils/i18n';

export class ConfigDa {
    private CACHE_KEY = 'chat-config';
    private MODELS_CACHE_KEY = 'chat-models';
    private context: vscode.ExtensionContext;

    private defaultModels: ChatModel[] = [
        {
            platform: 'deepseek',
            name: 'deepseek-v4-flash',
            label: 'v4-flash',
            ability: 'text'
        },
        {
            platform: 'deepseek',
            name: 'deepseek-v4-pro',
            label: 'v4-pro',
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'doubao-seed-1-6-lite-251015',
            label: '16-lite',
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'doubao-seed-code-preview-251028',
            label: 'code',
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'doubao-seed-1-8-251228',
            label: 'seed-18',
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'doubao-seed-1-6-vision-250815',
            label: 'seed-16',
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'doubao-seed-1-6-flash-250828',
            label: 'flash',
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'glm-4-7-251222',
            label: 'glm',
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'kimi-k2-thinking-251104',
            label: 'kimi',
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'deepseek-v3-2-251201',
            label: 'dsv3',
            ability: 'text'
        }
    ];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public get models(): ChatModel[] {
        const cache = this.context.globalState.get<ChatModel[]>(this.MODELS_CACHE_KEY);
        if (cache && cache.length > 0) {
            return cache;
        }
        return this.defaultModels;
    }

    public async saveModels(models: ChatModel[]) {
        await this.context.globalState.update(this.MODELS_CACHE_KEY, models);
    }

    public platforms: ModePlatform[] = [
        'deepseek',
        'volcengine'
    ];

    public get defaultChatModel() {
        const model = this.models.find(x => {
            return this.data.chatModel.platform === x.platform;
        });
        return model
    }

    public get defaultCodeModel() {
        const model = this.models.find(x => {
            return this.data.codeModel.platform === x.platform;
        });
        return model
    }

    public get data() {
        const cache = this.context.globalState.get(this.CACHE_KEY) as ChatConfig;
        if (cache != undefined && cache.chatModel && cache.codeModel) {
            return cache;
        }
        const conf: ChatConfig = {
            mode: 'norm',
            thinking: false,
            chatModel: {
                platform: 'deepseek',
                name: 'deepseek-chat',
                label: 'chat',
                ability: 'text'
            },
            codeModel: {
                platform: 'deepseek',
                name: 'deepseek-chat',
                label: 'chat',
                ability: 'text'
            },
        };
        return conf;
    }

    public async saveConfig(conf: ChatConfig) {
        await this.context.globalState.update(this.CACHE_KEY, conf);
    }

    public CacheKey (modalType: ChatConfigModeType){
        const config = this.data;
        if (modalType === 'chat') {
            return this.context.extension.id + config.chatModel.platform;
        }else{
            return this.context.extension.id + config.codeModel.platform;
        }
    }

    public setToken(token: string,platform: ModePlatform) {
        const id = this.context.extension.id + platform;
        this.context.secrets.store(id, token);
    }

    public async getToken(modalType: ChatConfigModeType) {
        return await this.context.secrets.get(this.CacheKey(modalType));
    }

    public async getTokenByPlatform(platform: ModePlatform) {
        const id = this.context.extension.id + platform;
        return await this.context.secrets.get(id);
    }
}