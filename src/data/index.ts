import Dexie from "dexie";

export const db = new Dexie('my-cat');

db.on('blocked',()=>{
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