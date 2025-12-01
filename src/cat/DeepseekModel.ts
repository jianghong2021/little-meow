import * as vscode from 'vscode';
import { ConfigDa } from '../data/ConfigDb';

export enum DeepseekTemperature {
    CODE = 0.0,
    DATA = 1.0,
    CHAT = 1.3,
    CREATOR = 1.5
}

export class DeepseekModel {
    private API_URL = 'https://api.deepseek.com';
    private API_TOKEN = '';
    private lastCheck = 0;
    public MAX_CONTEXT_SIZE = 127 * 1024 * 0.85;
    private lastGetAccount = 0;

    public async initConfig(context: vscode.ExtensionContext) {
        const now = Date.now();
        if (this.API_TOKEN && this.lastCheck > 0 && now - this.lastCheck < 1000 * 15) {
            return
        }
        this.lastCheck = now;
        const config = new ConfigDa(context);
        this.API_TOKEN = (await config.getToken()) || '';

        this.getAccountBalance()
    }

    private async request(msg: string, scope = '', memory = ''): Promise<string> {
        if (!this.API_TOKEN) {
            throw Error('请先去DeepSeek官网申请API令牌Token，并在右上角菜单配置')
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
                    { "role": "system", "content": "你是一只有编程大师称呼的卡通猫咪，昵称: 小喵喵, 回答中随机加上emoji" },
                    { "role": "system", "content": '回答问题时，注意内容简练，尽可能的简短，不要过多不必要的赘述' },
                    { "role": "system", "content": scope },
                    { "role": "system", "content": `用户历史提问(|分割): ${memory}` },
                    { "role": "user", "content": msg }
                ],
                "stream": false
            })
        })
        const data: any = await res.json()
        if (!data.choices[0]) {
            throw Error('生成失败，请稍后重试')
        }
        const code = data.choices[0].message.content;
        return code;
    }

    public async sendMsg(msg: string, scope = '', memory = '') {
        try {
            const res = await this.request(msg, scope, memory);
            return res;
        } catch (error: any) {
            return `${error.message || '未知错误'}`
        }
    }

    private async completions(prompt: string, suffix = ''): Promise<string> {
        if (!this.API_TOKEN) {
            throw Error('请先去DeepSeek官网申请API令牌Token，并在右上角菜单配置')
        }
        const res = await fetch(`${this.API_URL}/beta/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            },
            body: JSON.stringify({
                "model": "deepseek-chat",
                "temperature": DeepseekTemperature.DATA,
                "max_tokens": 1024,
                echo: false,
                prompt,
                suffix,
                "stream": false
            })
        })
        const data: any = await res.json()
        if (!data.choices[0]) {
            throw Error('生成失败，请稍后重试')
        }
        this.getAccountBalance()
        const code = data.choices[0].text;
        return code;
    }

    public async completionsCode(prompt: string, suffix = '') {
        try {
            const res = await this.completions(prompt, suffix);
            return res;
        } catch (error: any) {
            return `${error.message || '未知错误'}`
        }
    }

    private async getCode(msg: string): Promise<string> {
        if (!this.API_TOKEN) {
            throw Error('请先去DeepSeek官网申请API令牌Token，并在右上角菜单配置')
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
                    { "role": "user", "content": msg }
                ],
                "stream": false
            })
        })
        const data: any = await res.json()
        if (!data.choices[0]) {
            throw Error('生成失败，请稍后重试')
        }
        const code = data.choices[0].message.content;
        return code;
    }

    public async genrateCode(prompt: string) {
        try {
            const res = await this.getCode(prompt);
            return res;
        } catch (error: any) {
            return `${error.message || '未知错误'}`
        }
    }

    public async getAccountBalance() {
        const now = Date.now();
        if (this.lastGetAccount > 0 && now - this.lastGetAccount < 5_000) {
            return
        }
        this.lastGetAccount = now;
        const res = await fetch(`${this.API_URL}/user/balance`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.API_TOKEN
            }
        })
        const data: AccountBalance | undefined = await res.json().catch((err) => {
            console.log(err)
            return undefined
        });
        if (!data) {
            vscode.window.setStatusBarMessage('小喵喵: 获取账户失败')
            return
        }

        let text = `小喵喵: 余额不足`;
        if (data.is_available) {
            const balance = data.balance_infos[0];
            text = `小喵喵: ${balance.total_balance} ${balance.currency}`
        }

        console.log(data)

        vscode.window.setStatusBarMessage(text)
    }
}