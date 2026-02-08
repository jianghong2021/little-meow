import { db, tableExists } from '.';

export class AgentMsgDbs {

    private TABLE = 'agent-msg';
    private CONFIG_TABLE = 'agent-prompt';
    public async init() {
        if (!await tableExists(this.TABLE)) {
            db.version(1).stores({
                'agent-msg': '&id,workspace,type,source,data,content,date,[workspace+date]'
            });
        }
        if (!await tableExists(this.CONFIG_TABLE)) {
            db.version(1).stores({
                'agent-prompt': '&id,workspace,prompt'
            });
        }
    }

    public async getAll(workspace: string,limit = 50) {
        const res: ConsoleMessage[] = await db.table(this.TABLE).where('workspace').equals(workspace).limit(limit).toArray();
        return res.sort((a, b) => a.date - b.date);
    }

    public async one(id: string) {
        const res = await db.table(this.TABLE).get(id);
        return res as ConsoleMessage | undefined;
    }

    public async getCommPrompt(workspace: string) {
        const res = await db.table(this.CONFIG_TABLE).where('workspace').equals(workspace).first();
        return res as AgentCommPrompt | undefined;
    }

    public async setCommPrompt(data: AgentCommPrompt) {
        const old = await this.getCommPrompt(data.workspace);
        if(old){
            await db.table(this.CONFIG_TABLE).update(old.id,data)
        }else{
            await db.table(this.CONFIG_TABLE).add(data)
        }
    }

    public async update(id: string, data: ConsoleMessage) {
        const old = await this.one(id);
        if (old) {
            await db.table(this.TABLE).update(id, { ...data });
        }
    }

    public async addOrUpdate(data: ConsoleMessage) {
        try {
            const old = await this.one(data.id);
            if (old) {
                await this.update(old.id, data);
            } else {
                await this.insert(data);
            }
        } catch (err) {
            console.error(data)
            console.error(err)
        }
    }

    public async insert(data: ConsoleMessage) {
        await db.table(this.TABLE).add(data)
    }

    public remove(id: string) {
        return db.table(this.TABLE).delete(id)
    }

    public async removeAll(workspace: string) {
        await db.table(this.TABLE).where("workspace").equals(workspace).delete();
    }

    public async clear() {
        await db.table(this.TABLE).clear();
        await db.table(this.CONFIG_TABLE).clear();
    }
}