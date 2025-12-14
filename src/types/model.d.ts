/**
 * 基础模型,扩展模型需要继承此
 */
interface AiCommModel {
    /**最大上下文 */
    MAX_CONTEXT_SIZE: number
    /**普通聊天 */
    chat: (prompt: string, snippet?: string, memory?: string) => Promise<string>
    /**sse聊天，流式 */
    sseChat: (prompt: string, snippet?: string, memory?: string,onMsg?:(msg: string)=>void) => Promise<void>
    /**生成代码 */
    code: (prompt: string) => Promise<string>
    /**API账户余额 */
    getAccountBalance: ()=>Promise<void>
}