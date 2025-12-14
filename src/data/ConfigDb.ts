import * as vscode from 'vscode';

export class ConfigDa {
    private CACHE_KEY = 'chat-config';
    private context: vscode.ExtensionContext;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public models:ChatModel[] = [
        {
            type: 'deepseek',
            name: 'deepseek-chat',
            label: 'deepseek-chat'
        },
        {
            type: 'deepseek',
            name: 'deepseek-reasoner',
            label: 'deepseek-reasoner'
        }
    ];

    public get data() {
        const cache = this.context.globalState.get(this.CACHE_KEY);
        if (cache) {
            return cache as ChatConfig;
        }
        const conf: ChatConfig = {
            mode: 'norm',
            model: {
                type: 'deepseek',
                name: 'deepseek-chat',
                label: 'chat'
            }
        };
        return conf;
    }

    public async saveConfig(conf: ChatConfig) {
        await this.context.globalState.update(this.CACHE_KEY, conf);
    }

    public setToken(token: string){
        const config = this.data;
        const id = this.context.extension.id + config.model.type;
        this.context.secrets.store(id,token);
    }

    public async getToken(){
        const config = this.data;
        const id = this.context.extension.id + config.model.type;
        return await this.context.secrets.get(id);
    }
}