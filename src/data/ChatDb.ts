import { db, tableExists } from ".";

export class ChatDb {
    private TABLE = 'chats';
    public async init() {
        if (await tableExists(this.TABLE)) {
            return
        }
        db.version(1).stores({
            chats: '&id, title, done,content,date,role,fid'
        });
    }

    public async getAll() {
        const res = await db.table(this.TABLE).orderBy('date').toArray();
        return res as ChatDetails[]
    }

    public async one(id: string){
        const res = await db.table(this.TABLE).get(id);
        return res as ChatDetails|undefined
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

    public async clear(){
        await db.table(this.TABLE).clear()
    }
}