interface AiCommModel {
    MAX_CONTEXT_SIZE: number
    chat: (prompt: string, snippet?: string, memory?: string) => Promise<string>
    sseChat: (prompt: string, snippet?: string, memory?: string,onMsg?:(msg: string)=>void) => Promise<void>
    code: (prompt: string) => Promise<string>
    getAccountBalance: ()=>Promise<void>
}