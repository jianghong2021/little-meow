import { getAgentTools, parseAgentToolResponse } from './AgentTools';

export class OpenAiModel implements AiCommModel {
    private API_URL = '';
    private API_TOKEN = '';
    private defaultModel = '';
    public MAX_CONTEXT_SIZE = 127 * 1024 * 0.85;

    constructor(token: string, baseUrl: string, model?: string) {
        this.API_TOKEN = token;
        this.API_URL = baseUrl.replace(/\/+$/, '');
        this.defaultModel = model || 'gpt-4o-mini';
    }

    public async request(model: string, prompt: string, snippet = '', memory: GeneralMessage[] = []): Promise<string> {
        if (!this.API_TOKEN) {
            throw Error('请先配置API Token');
        }
        if (!this.API_URL) {
            throw Error('请先在设置中配置Base URL');
        }
        const body = JSON.stringify({
            "model": model,
            "temperature": 0.0,
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
        if (data['error']) {
            throw Error(data['error']['message'] || 'unknown error');
        }
        if (!data.choices[0]) {
            throw Error('生成失败，请稍后重试');
        }
        return data.choices[0].message.content;
    }

    public async requestSSE(model: string, prompt: string, snippet = '', memory: GeneralMessage[] = [], thinking = false) {
        if (!this.API_TOKEN) {
            throw Error('请先配置API Token');
        }
        if (!this.API_URL) {
            throw Error('请先在设置中配置Base URL');
        }
        const body: { [k: string]: any } = {
            "model": model,
            "temperature": 0.0,
            "max_tokens": 8192,
            "messages": [
                { "role": "system", "content": "你是一只有编程大师称呼的卡通猫咪，昵称: 小喵喵, 回答中随机加上心情emoji" },
                { "role": "system", "content": '回答问题时，内容简练，不要过多不必要的赘述' },
                { "role": "system", "content": snippet },
                ...memory,
                { "role": "user", "content": prompt }
            ],
            "stream": true
        };
        const res = await fetch(`${this.API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            },
            body: JSON.stringify(body)
        });
        const stream = res.body?.getReader();
        if (!stream) {
            throw Error('获取流失败');
        }
        return stream;
    }

    private async getCode(prompt: string, model: string): Promise<string> {
        if (!this.API_TOKEN) {
            throw Error('请先配置API Token');
        }
        if (!this.API_URL) {
            throw Error('请先在设置中配置Base URL');
        }
        const res = await fetch(`${this.API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            },
            body: JSON.stringify({
                "model": model,
                "temperature": 0.0,
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
        if (data['error']) {
            throw Error(data['error']['message'] || 'unknown error');
        }
        if (!data.choices[0]) {
            throw Error('生成失败，请稍后重试');
        }
        return data.choices[0].message.content;
    }

    private async agentCode(prompt: string, source?: string): Promise<any> {
        if (!this.API_TOKEN) {
            throw Error('请先配置API Token');
        }
        if (!this.API_URL) {
            throw Error('请先在设置中配置Base URL');
        }
        const messages: any[] = [
            { role: 'system', content: '你是小喵喵,一只编程大师卡通猫咪,负责代码的编辑和创建任务' }
        ];
        if (source) {
            messages.push({ role: 'system', content: `当前源码:\n\`\`\`\n${source}\n\`\`\`` });
        }
        messages.push({ role: 'user', content: prompt });

        const res = await fetch(`${this.API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            },
            body: JSON.stringify({
                model: this.defaultModel,
                temperature: 0.0,
                max_tokens: 16384,
                messages,
                tools: getAgentTools(),
                tool_choice: 'required',
                stream: false
            })
        });
        return await res.json();
    }

    public async getAccountBalance() {
    }

    chat(model: string, prompt: string, snippet?: string, memory?: GeneralMessage[]) {
        return this.request(model, prompt, snippet, memory);
    }

    async code(prompt: string) {
        return this.getCode(prompt, this.defaultModel);
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
                    throw Error(data['error']['message'] || 'unknown error');
                }
                if (!data.choices[0]) {
                    continue;
                }
                const cont = data.choices[0].delta.content || '';
                const reasoning = data.choices[0].delta.reasoning_content || '';
                const m: SseGeneralMessage = {
                    content: cont,
                    reasoningContent: reasoning
                };
                onMsg(m);
            }
        }
    }

    async agent(prompt: string, source?: string) {
        try {
            const data = await this.agentCode(prompt, source);
            if (data.error) {
                const msg: AgentMessage = {
                    content: '',
                    description: '',
                    instruction: 'editDocument',
                    prompt: '',
                    error: data.error.message || 'unknown error'
                };
                return msg;
            }
            return parseAgentToolResponse(data);
        } catch (err: any) {
            const msg: AgentMessage = {
                content: '',
                description: '',
                instruction: 'editDocument',
                prompt: '',
                error: err.message || '解析失败'
            };
            return msg;
        }
    }
}
