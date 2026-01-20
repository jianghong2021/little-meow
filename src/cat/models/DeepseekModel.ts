import * as vscode from 'vscode';
import { ConfigDa } from '../../data/ConfigDb';

export enum DeepseekTemperature {
    CODE = 0.0,
    DATA = 1.0,
    CHAT = 1.3,
    CREATOR = 1.5
}

export class DeepseekModel implements AiCommModel {
    private API_URL = 'https://api.deepseek.com';
    private API_TOKEN = '';
    private lastCheck = 0;
    public MAX_CONTEXT_SIZE = 127 * 1024 * 0.85;

    public thinking = {
        enabled: {
            type: 'enabled'
        },
        disabled: {
            type: 'disabled'
        }
    }

    constructor(token: string) {
        this.API_TOKEN = token;
    }

    public async initConfig(context: vscode.ExtensionContext) {
        const now = Date.now();
        if (this.API_TOKEN && this.lastCheck > 0 && now - this.lastCheck < 1000 * 15) {
            return;
        }
        this.lastCheck = now;
        const config = new ConfigDa(context);
        this.API_TOKEN = (await config.getToken()) || '';

        this.getAccountBalance();
    }

    public async request(model: string, prompt: string, snippet = '', memory: GeneralMessage[] = []): Promise<string> {
        if (!this.API_TOKEN) {
            throw Error('请先去[DeepSeek](https://platform.deepseek.com/)官网申请API令牌Token，并在右上角菜单配置');
        }
        const body = JSON.stringify({
            "model": model,
            "temperature": DeepseekTemperature.CODE,
            "max_tokens": 8192,
            "messages": [
                { "role": "system", "content": "你是一只有编程大师称呼的卡通猫咪，昵称: 小喵喵, 回答中随机加上emoji" },
                { "role": "system", "content": '回答问题时，注意内容简练，尽可能的简短，不要过多不必要的赘述' },
                { "role": "system", "content": snippet },
                ...memory,
                { "role": "user", "content": prompt }
            ],
            "stream": false
        });
        const res = await fetch(`${this.API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            },
            body
        });
        const data: any = await res.json();
        if (!data.choices[0]) {
            throw Error('生成失败，请稍后重试');
        }
        const code = data.choices[0].message.content;
        return code;
    }

    public async requestSSE(model: string, prompt: string, snippet = '', memory: GeneralMessage[] = [], thinking = false) {
        if (!this.API_TOKEN) {
            throw Error('请先去[DeepSeek](https://platform.deepseek.com/)官网申请API令牌Token，并在右上角菜单配置');
        }
        const body = JSON.stringify({
            "model": model,
            "temperature": DeepseekTemperature.CODE,
            "max_tokens": 8192,
            "thinking": thinking ? this.thinking.enabled : this.thinking.disabled,
            "messages": [
                { "role": "system", "content": "你是一只有编程大师称呼的卡通猫咪，昵称: 小喵喵, 回答中随机加上心情emoji" },
                { "role": "system", "content": '回答问题时，内容简练，不要过多不必要的赘述' },
                { "role": "system", "content": snippet },
                ...memory,
                { "role": "user", "content": prompt }
            ],
            "stream": true
        });
        const res = await fetch(`${this.API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            },
            body
        });
        const stream = res.body?.getReader();
        if (!stream) {
            throw Error('获取流失败');
        }

        return stream;
    }

    private async getCode(prompt: string): Promise<string> {
        if (!this.API_TOKEN) {
            throw Error('请先去[DeepSeek](https://platform.deepseek.com/)官网申请API令牌Token，并在右上角菜单配置');
        }
        const res = await fetch(`${this.API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            },
            body: JSON.stringify({
                "model": "deepseek-chat",
                "temperature": DeepseekTemperature.CODE,
                "max_tokens": 8192,
                "messages": [
                    { "role": "system", "content": '你仅负责代码生成，以纯源码格式返回，不要markdown' },
                    { "role": "system", "content": '回答问题时，注意内容简练，尽可能的简短，不要过多不必要的赘述' },
                    { "role": "user", "content": prompt }
                ],
                "stream": false
            })
        });
        const data: any = await res.json();
        if (!data.choices[0]) {
            throw Error('生成失败，请稍后重试');
        }
        const code = data.choices[0].message.content;
        return code;
    }

    private async agentCode(prompt: string, source?: string): Promise<string> {
        if (!this.API_TOKEN) {
            throw Error('请先去[DeepSeek](https://platform.deepseek.com/)官网申请API令牌Token，并在右上角菜单配置');
        }
        const res = await fetch(`${this.API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            },
            body: JSON.stringify({
                "model": "deepseek-chat",
                "temperature": DeepseekTemperature.CODE,
                "max_tokens": 8192,
                "messages": [
                    { "role": "system", "content": '你仅负责代码生成，以纯源码格式返回，不要markdown' },
                    { "role": "system", "content": `源码: \n ${source}` },
                    {
                        "role": "system", "content": `
                    按照要求改动用户源码(若无源码,则按照要求生成全新源码),将新的源码放于字段"content",改动说明或源码简要放于字段"compare",
                    "description"说明尽量简洁表达.
                    "instruction"根据用户提示词设置,是创建还是编辑.可选值: 'editDocument'|'createDocument'
                    输出示例json:
                    {
                        "content":"const a=1;",
                        "description": "改动了函数xx,重新优化此函数",
                        "instruction": "editDocument"
                    }    
                    ` },
                    { "role": "user", "content": prompt }
                ],
                "stream": false
            })
        });
        const data: any = await res.json();
        if (!data.choices[0]) {
            throw Error('生成失败，请稍后重试');
        }
        const code = data.choices[0].message.content;
        return code;
    }

    public async getAccountBalance() {
        const res = await fetch(`${this.API_URL}/user/balance`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            }
        });
        const data: AccountBalance | undefined = await res.json().catch((err) => {
            console.log(err);
            return undefined;
        });
        if (!data) {
            vscode.window.setStatusBarMessage('小喵喵: 获取账户失败');
            return;
        }

        let text = `小喵喵: 余额不足`;
        if (data.is_available) {
            const balance = data.balance_infos[0];
            text = `小喵喵: ${balance.total_balance} ${balance.currency}`;
        }

        vscode.window.setStatusBarMessage(text);
    }

    chat(model: string, prompt: string, snippet?: string, memory?: GeneralMessage[]) {
        return this.request(model, prompt, snippet, memory);
    }
    async code(prompt: string) {

        return this.getCode(prompt);
    }

    async sseChat(model: string, prompt: string, snippet?: string, memory?: GeneralMessage[], thinking = false, onMsg?: (msg: SseGeneralMessage) => void) {
        if (!onMsg) {
            return;
        }
        const stream = await this.requestSSE(model, prompt, snippet, memory, thinking);

        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await stream.read();
            if (done) {
                break;
            }
            const chunk = decoder.decode(value).trim();
            if (chunk.includes('[DONE]')) {
                break;
            }
            if (chunk === '') {
                continue;
            }
            const ar = chunk.split('\n');
            for (const s of ar) {
                if (s.trim() === '') {
                    continue;
                }
                const line = s.replace(/data\:\s?/i, '');
                const data = JSON.parse(line);
                if (data['error']) {
                    throw Error(data['error']['message'] || 'unknown error')
                }
                if (!data.choices[0]) {
                    continue;
                }
                const cont = data.choices[0].delta.content || '';
                const reasoning = data.choices[0].delta.reasoning_content || ''
                const m: SseGeneralMessage = {
                    content: cont,
                    reasoningContent: reasoning
                }
                onMsg(m);
            }

        }
    }

    async agent(prompt: string, source?: string) {
        const msg: AgentMessage = {
            content: '',
            description: '',
            instruction: 'editDocument'
        }
        try {
            const text = await this.agentCode(prompt, source);
            const code = text.replaceAll(/\`{3}(\w+)?/g, '');
            return JSON.parse(code);
        } catch (err: any) {
            msg.error = err.message || '解析失败'
            return msg
        }
    }
}