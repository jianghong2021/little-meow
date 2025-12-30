import * as vscode from 'vscode';

export class AgentMsgDbs {
    private CACHE_KEY = 'agent-console';
    private context: vscode.ExtensionContext;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public getAll() {
        const res: ConsoleMessage[] = this.context.globalState.get(this.CACHE_KEY) || [];
        return res.sort((a, b) => a.date - b.date);
    }

    public one(id: string) {
        return this.getAll().find(x => x.id === id);
    }


    public update(id: string, data: ConsoleMessage) {
        const ar = this.getAll();
        for (let i = 0; i < ar.length; i++) {
            if (ar[i].id === id) {
                ar[i] = { ...data };
                break;
            }
        }

        this.context.globalState.update(this.CACHE_KEY, ar);
    }

    private createID() {
        const str = 'qwertyuiopasdfghjklzxcvbnm';
        const ar: string[] = [];
        const now = Date.now();
        for (let i = 0; i < 16; i++) {
            const r = Math.floor(Math.random() * str.length);
            if (now % 2) {
                ar.push(str[i]);
            } else {
                ar.push(str[str.length - i - 1]);
            }
        }
        const nowStr = now.toString();
        const dateAr: string[] = [];
        for (let i = 0; i < nowStr.length; i++) {
            const index = parseInt(nowStr[i]);
            dateAr.push(str[index]);
        }
        return `${ar.join('')}-${dateAr.join('')}`;
    }

    public insert(data: ConsoleMessage) {
        data.id = this.createID();
        const ar = this.getAll();
        ar.push(data);
        this.context.globalState.update(this.CACHE_KEY, ar);
        return data;
    }

    public remove(id: string) {
        const ar = this.getAll().filter(x => x.id !== id);
        this.context.globalState.update(this.CACHE_KEY, ar);
    }

    public removeAll() {
        this.context.globalState.update(this.CACHE_KEY, []);
    }

    public clear() {
        this.context.globalState.update(this.CACHE_KEY, undefined);
    }
}