import * as vscode from 'vscode';
import { ConfigDa } from '../data/ConfigDb';

export class DeepseekModel {
    private API_URL = 'https://api.deepseek.com';
    private API_TOKEN = '';
    private lastCheck = 0;

    public async initConfig(context: vscode.ExtensionContext) {
        const now = Date.now();
        if (this.API_TOKEN && this.lastCheck > 0 && now - this.lastCheck < 1000 * 15) {
            return
        }
        this.lastCheck = now;
        const config = new ConfigDa(context);
        this.API_TOKEN = (await config.getToken()) || '';
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
                "temperature": 0.0,
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
}