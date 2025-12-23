import * as vscode from 'vscode';

export class ConversationDb {
    private CACHE_KEY = 'chat-conversations';
    private context: vscode.ExtensionContext;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public getAll() {
        const res: ConversationDetails[] = this.context.globalState.get(this.CACHE_KEY) || [];
        return res.sort((a, b) => b.date - a.date);
    }

    public one(id: string) {
        return this.getAll().find(x => x.id === id);
    }

    public latestOrSelected() {
        const ar = this.getAll();
        const selected = ar.find(x => x.selected);
        if (selected) {
            return selected;
        }
        if (ar.length === 0) {
            return;
        }
        const conv = ar[0];
        conv.selected = true;
        this.setActive(conv.id);

        return conv;
    }

    public update(id: string, data: ConversationDetails) {
        const ar = this.getAll();
        for (let i = 0; i < ar.length; i++) {
            if (ar[i].id === id) {
                ar[i] = { ...data };
                break;
            }
        }

        this.context.globalState.update(this.CACHE_KEY, ar);
    }

    public setActive(id: string) {
        const ar = this.getAll();
        for (let i = 0; i < ar.length; i++) {
            if (ar[i].id === id) {
                ar[i].selected = true;
            } else {
                ar[i].selected = false;
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

    public new() {
        const data: ConversationDetails = {
            id: '',
            title: 'New Conversation',
            selected: true,
            date: Date.now(),
            mode: 'code'
        };
        data.id = this.createID();
        const ar = this.getAll();
        ar.push(data);
        this.context.globalState.update(this.CACHE_KEY, ar);
        return data;
    }

    public insert(data: ConversationDetails) {
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