import * as vscode from 'vscode';

export class ConfigDa {
    private CACHE_KEY = 'chat-config'
    private context: vscode.ExtensionContext;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public getConfig() {
        const cache = this.context.globalState.get(this.CACHE_KEY);
        if (cache) {
            return cache as ChatConfig
        }
        const conf: ChatConfig = {
            mode: 'norm'
        }
        return conf;
    }

    public saveConfig(conf: ChatConfig) {
        this.context.globalState.update(this.CACHE_KEY, conf);
    }

    public setToken(token: string){
        const id = this.context.extension.id;
        this.context.secrets.store(id,token);
    }

    public async getToken(){
        const id = this.context.extension.id;
        return await this.context.secrets.get(id);
    }
}