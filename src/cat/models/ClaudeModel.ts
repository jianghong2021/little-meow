
export class ClaudeModel implements AiCommModel{
    public MAX_CONTEXT_SIZE = 127 * 1024 * 0.85;
    private API_TOKEN:string;
    constructor(token: string){
        this.API_TOKEN = token;
    }
    async getAccountBalance(){

    }
    chat<T>(prompt: string, snippet?: string, memory?: string){
        return '' as T
    }
    
    async code(prompt: string){

        return ''
    }

    async sseChat(prompt: string, snippet?: string, memory?: string,onMsg?:(msg: string)=>void){
        
    }

}