import * as vscode from 'vscode';

export class ConversationDb {
    private CACHE_KEY = 'chat-conversations';
    private context: vscode.ExtensionContext;
    private workspace: string;

    constructor(context: vscode.ExtensionContext, workspace?: string) {
        this.context = context;
        this.workspace = workspace || '';
    }

    private rawGetAll(): ConversationDetails[] {
        return this.context.globalState.get(this.CACHE_KEY) || [];
    }

    private isCurrentWorkspace(conv: ConversationDetails): boolean {
        return (conv.workspace || '') === this.workspace;
    }

    public getAll() {
        const all = this.rawGetAll();
        return all
            .filter(x => this.isCurrentWorkspace(x))
            .sort((a, b) => b.date - a.date);
    }

    public one(id: string) {
        return this.rawGetAll().find(x => x.id === id);
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
        const ar = this.rawGetAll();
        for (let i = 0; i < ar.length; i++) {
            if (ar[i].id === id) {
                ar[i] = { ...data };
                break;
            }
        }

        this.context.globalState.update(this.CACHE_KEY, ar);
    }

    public setActive(id: string) {
        const ar = this.rawGetAll();
        for (let i = 0; i < ar.length; i++) {
            if (this.isCurrentWorkspace(ar[i])) {
                ar[i].selected = ar[i].id === id;
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
            mode: 'code',
            workspace: this.workspace
        };
        data.id = this.createID();
        const ar = this.rawGetAll();
        for (const item of ar) {
            if (this.isCurrentWorkspace(item)) {
                item.selected = false;
            }
        }
        ar.push(data);
        this.context.globalState.update(this.CACHE_KEY, ar);
        return data;
    }

    public insert(data: ConversationDetails) {
        data.id = this.createID();
        data.workspace = this.workspace;
        const ar = this.rawGetAll();
        for (const item of ar) {
            if (this.isCurrentWorkspace(item)) {
                item.selected = false;
            }
        }
        ar.push(data);
        this.context.globalState.update(this.CACHE_KEY, ar);
        return data;
    }

    public remove(id: string) {
        const ar = this.rawGetAll().filter(x => x.id !== id);
        this.context.globalState.update(this.CACHE_KEY, ar);
    }

    public removeAll() {
        const ar = this.rawGetAll().filter(x => !this.isCurrentWorkspace(x));
        this.context.globalState.update(this.CACHE_KEY, ar);
    }

    public clear() {
        this.context.globalState.update(this.CACHE_KEY, undefined);
    }
}
