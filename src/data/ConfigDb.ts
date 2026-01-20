import * as vscode from 'vscode';
import { I18nUtils } from '../utils/i18n';

export class ConfigDa {
    private CACHE_KEY = 'chat-config';
    private context: vscode.ExtensionContext;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public models:ChatModel[] = [
        {
            platform: 'deepseek',
            name: 'deepseek-chat',
            label: I18nUtils.t('ai.chat.chat'),
            ability: 'text'
        },
        {
            platform: 'deepseek',
            name: 'deepseek-reasoner',
            label: I18nUtils.t('ai.chat.reasoner'),
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'doubao-seed-1-6-lite-251015',
            label: I18nUtils.t('ai.chat.chat'),
            ability: 'text'
        },
        {
            platform: 'volcengine',
            name: 'doubao-seed-code-preview-251028',
            label: I18nUtils.t('ai.chat.code'),
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

    public platforms: ModePlatform[] = [
        'deepseek',
        'volcengine'
    ];

    public get defaultModel(){
        const model = this.models.find(x=>{
            return this.data.model.platform === x.platform;
        });
        return model
    }

    public get data() {
        const cache = this.context.globalState.get(this.CACHE_KEY);
        if (cache) {
            return cache as ChatConfig;
        }
        const conf: ChatConfig = {
            mode: 'norm',
            thinking: false,
            model: {
                platform: 'deepseek',
                name: 'deepseek-chat',
                label: 'chat',
                ability: 'text'
            }
        };
        return conf;
    }

    public async saveConfig(conf: ChatConfig) {
        await this.context.globalState.update(this.CACHE_KEY, conf);
    }

    public setToken(token: string){
        const config = this.data;
        const id = this.context.extension.id + config.model.platform;
        this.context.secrets.store(id,token);
    }

    public async getToken(){
        const config = this.data;
        const id = this.context.extension.id + config.model.platform;
        return await this.context.secrets.get(id);
    }
}