import Dexie from "dexie";
import { db, tableExists } from ".";

export class ChatDb {
    private TABLE = 'chats';
    public async init() {
        if (await tableExists(this.TABLE)) {
            return
        }
        db.version(1).stores({
            chats: '&id, title,conversationId, done,content,date,role,fid, [conversationId+date]'
        });
    }

    public async getAll(conversationId: string) {
        const res: ChatDetails[] = await db.table(this.TABLE)
            .where('[conversationId+date]')
            .between(
                [conversationId, Dexie.minKey],
                [conversationId, Dexie.maxKey]
            )
            .reverse()
            .limit(50)
            .toArray();
        const ar = res.sort((a, b) => a.date - b.date)
        return ar
    }

    public async getHistory(date: number) {
        const res: ChatDetails[] = await db.table(this.TABLE)
            .where('date')
            .below(date)
            .filter(x => x.role == 'user')
            .limit(20)
            .toArray();

        return res
    }

    public async one(id: string) {
        const res = await db.table(this.TABLE).get(id);
        return res as ChatDetails | undefined
    }

    public async addOrUpdate(data: ChatDetails) {
        const old = await this.one(data.id);
        if (old) {
            await this.update(old.id, data);
        } else {
            await this.insert(data);
        }
    }

    public async insert(data: ChatDetails) {
        await db.table(this.TABLE).add(data)
    }

    public async update(id: string, data: ChatDetails) {
        await db.table(this.TABLE).update(id, { ...data });
    }

    public async remove(id: string) {
        await db.table(this.TABLE).delete(id)
    }

    public async clear(id: string) {
        await db.table(this.TABLE)
            .where('conversationId')
            .equals(id)
            .delete()
    }
}