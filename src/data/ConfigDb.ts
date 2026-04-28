import * as vscode from 'vscode';
import { I18nUtils } from '../utils/i18n';

export class ConfigDa {
    private CACHE_KEY = 'chat-config';
    private MODELS_CACHE_KEY = 'chat-models';
    private PROVIDERS_CACHE_KEY = 'custom-providers';
    private context: vscode.ExtensionContext;

    private BUILTIN_PLATFORMS: ModePlatform[] = [
        'deepseek',
        'volcengine'
    ];

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

    public get customProviders(): CustomProvider[] {
        const cache = this.context.globalState.get<CustomProvider[]>(this.PROVIDERS_CACHE_KEY);
        return cache || [];
    }

    public async saveCustomProviders(providers: CustomProvider[]) {
        await this.context.globalState.update(this.PROVIDERS_CACHE_KEY, providers);
    }

    public get platforms(): ModePlatform[] {
        const custom = this.customProviders.map(p => p.id);
        return [...this.BUILTIN_PLATFORMS, ...custom];
    }

    public getProviderByPlatform(platform: ModePlatform): CustomProvider | undefined {
        return this.customProviders.find(p => p.id === platform);
    }

    public isBuiltinPlatform(platform: ModePlatform): boolean {
        return this.BUILTIN_PLATFORMS.includes(platform);
    }

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
            const validPlatforms = this.platforms;
            if (!validPlatforms.includes(cache.chatModel.platform)) {
                cache.chatModel = {
                    platform: 'deepseek',
                    name: this.defaultModels[0].name,
                    label: this.defaultModels[0].label,
                    ability: 'text'
                };
            }
            if (!validPlatforms.includes(cache.codeModel.platform)) {
                cache.codeModel = {
                    platform: 'deepseek',
                    name: this.defaultModels[0].name,
                    label: this.defaultModels[0].label,
                    ability: 'text'
                };
            }
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

    public setToken(token: string, platform: ModePlatform) {
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

    public getBaseUrl(platform: ModePlatform): string {
        const conf = this.data;
        if (conf.platformBaseUrls?.[platform]) {
            return conf.platformBaseUrls[platform];
        }
        const provider = this.getProviderByPlatform(platform);
        if (provider) {
            return provider.baseUrl;
        }
        return '';
    }

    public async setBaseUrl(platform: ModePlatform, url: string) {
        const conf = { ...this.data };
        if (!conf.platformBaseUrls) {
            conf.platformBaseUrls = {};
        }
        conf.platformBaseUrls[platform] = url;
        await this.saveConfig(conf);
    }
}