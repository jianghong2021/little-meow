import Dexie from "dexie";

export const db = new Dexie('my-cat');

db.version(2).stores({
    'chats': '&id, title, conversationId, workspace, done, content, date, role, fid, [conversationId+workspace+date]',
    'agent-msg': '&id, workspace, prompt, type, source, data, content, status, date, [workspace+date]',
    'agent-prompt': '&id, workspace, prompt'
});

db.on('blocked', () => {
    console.log('db blocked')
})

export async function tableExists(tableName: string) {
    try {
        const table = db.table(tableName);
        return typeof table.count === 'function';
    } catch (error) {
        return false;
    }
}
