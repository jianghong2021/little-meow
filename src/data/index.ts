import Dexie from "dexie";

export const db = new Dexie('my-cat');

export async function tableExists(tableName: string) {
    try {
        const table = db.table(tableName);
        return typeof table.count === 'function';
    } catch (error) {
        return false;
    }
}