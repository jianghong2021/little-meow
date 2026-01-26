import Dexie from "dexie";
import { db, tableExists } from ".";

export class ChatDb {
    private TABLE = 'chats';
    public async init() {
        if (await tableExists(this.TABLE)) {
            return;
        }
        db.version(1).stores({
            chats: '&id, title,conversationId,workspace, done,content,date,role,fid, [conversationId+date]'
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
        const ar = res.sort((a, b) => a.date - b.date);
        console.log(ar)
        return ar;
    }

    public async getHistory(conversationId: string, id: string, date: number, max = 20) {
        const res: ChatDetails[] = await db.table(this.TABLE)
            .where('date')
            .below(date)
            .filter(x => x.conversationId == conversationId && x.id != id)
            .limit(max)
            .toArray();

        return res;
    }

    public async one(id: string) {
        const res = await db.table(this.TABLE).get(id);
        return res as ChatDetails | undefined;
    }

    public async addOrUpdate(data: ChatDetails) {
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

    public async insert(data: ChatDetails) {
        await db.table(this.TABLE).add(data);
    }

    public async update(id: string, data: ChatDetails) {
        await db.table(this.TABLE).update(id, { ...data });
    }

    public async remove(id: string) {
        await db.table(this.TABLE).delete(id);
    }

    public async deleteMessage(id: string, fid?: string) {
        await db.table(this.TABLE).delete(id);
        if (fid) {
            await db.table(this.TABLE).delete(fid)
        }
    }

    public async clear(id: string) {
        await db.table(this.TABLE)
            .where('conversationId')
            .equals(id)
            .delete();
    }

    public async clearAll() {
        await db.table(this.TABLE).clear()
    }
}