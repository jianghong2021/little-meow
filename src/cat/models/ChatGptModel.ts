
export class ChatGptModel implements AiCommModel{
    public MAX_CONTEXT_SIZE = 127 * 1024 * 0.85;
    private API_TOKEN:string;
    constructor(token: string){
        this.API_TOKEN = token;
    }
    
    async getAccountBalance(){

    }
    chat<T>(model: ChatModelId,prompt: string, snippet?: string, memory?: GeneralMessage[]){
        return '' as T;
    }
    async code(prompt: string){

        return '';
    }

    async sseChat(model: ChatModelId,prompt: string, snippet?: string, memory?: GeneralMessage[],thinking=false,onMsg?:(msg: SseGeneralMessage)=>void){
        
    }

}