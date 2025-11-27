import { v4 as uuidv4 } from 'uuid';
import { ChatDb } from '../data/ChatDb.js';
import { marked } from 'marked';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import { formatTimeAgo } from '../utils/date.js';

const vscode = acquireVsCodeApi();
window.addEventListener('message', onmessage);

hljs.registerLanguage('javascript', javascript);

const chatDb = new ChatDb();

// 获取DOM元素
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;
const chatMessages = document.getElementById('chat-messages') as HTMLElement;
const activeDocument = document.querySelector('#activeDocument span') as HTMLElement;

function onmessage(e: MessageEvent) {
    const { type, data } = e.data;
    switch (type) {
        case 'onPutMessage':
            onPutMessage(data);
            break
        case 'clearHistory':
            clearHistory()
            break
        case 'onDocumentChange':
            onDocumentChange(data)
    }
}

function getFileName(file: string) {
    const temp = file.split(/[\/\\]/);
    const fileName = temp[temp.length - 1].replaceAll(/\s/g, '');
    return fileName.substring(fileName.length - 16)
}

function onDocumentChange(file?: string) {
    window.initConfig.activeDocument = file;
    activeDocument.textContent = getFileName(window.initConfig.activeDocument || '');
}

function clearHistory() {
    chatDb.clear(window.initConfig.conversation.id);

    vscode.postMessage({ type: 'reload', data: undefined });
}

function pushMessage(msg: ChatDetails, onlyRender = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', msg.role);
    msgDiv.setAttribute('data-done', msg.done ? '1' : '0');
    msgDiv.setAttribute('data-id', msg.id);
    const text = marked.parse(msg.content);
    if (msg.done) {
        msgDiv.innerHTML = `
        <div class="msg">${text}</div>
        <div class="message-footer">
            <div class="btn-icon" style="display:${msg.role == 'ai' ? 'flex' : 'none'}">
                <img src="${window.initConfig.baseUrl}/icons/copy${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="copyMsgContent(this,'${msg.id}')"/>
                <img src="${window.initConfig.baseUrl}/icons/refresh${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="reSendMessage('${msg.id}','${msg.fid}')"/>
            </div>
            <span class="message-time">${formatTimeAgo(msg.date)}<span>
        </div>
        `;
    } else {
        msgDiv.innerHTML = `<div class="msg">${text}</div>`;
    }

    chatMessages.appendChild(msgDiv);
    if (!onlyRender) {
        chatDb.insert(msg);
    }

    scrollToBottom();

    hljs.highlightAll();
}

function onPutMessage(msg: ChatDetails, reset = true) {
    const msgDiv = chatMessages.querySelector("[data-done='0']");
    if (msgDiv) {
        //更新
        const text = marked.parse(msg.content);
        msgDiv.setAttribute('data-done', msg.done ? '1' : '0');

        msgDiv.innerHTML = `
        <div class="msg">${text}</div>
        <div class="message-footer" style="display:${msg.done ? 'flex' : 'none'}">
            <div class="btn-icon" style="display:${msg.role == 'ai' ? 'flex' : 'none'}">
                <img src="${window.initConfig.baseUrl}/icons/copy${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="copyMsgContent(this,'${msg.id}')"/>
                <img src="${window.initConfig.baseUrl}/icons/refresh${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="reSendMessage('${msg.id}','${msg.fid}')"/>
            </div>
            <span class="message-time">${formatTimeAgo(msg.date)}<span>
        </div>
        `;
        
        if (msg.done) {
            chatDb.addOrUpdate(msg);
        }

        hljs.highlightAll();
    } else {
        //新增
        pushMessage(msg)
    }
    if (reset) {
        sendButton.removeAttribute('disabled');
        messageInput.removeAttribute('disabled');
    }

}

async function copyMsgContent(img: HTMLElement, id: string) {
    const msg = await chatDb.one(id);
    if (!msg) {
        return
    }
    img.style.filter = 'sepia(1) saturate(10000%) hue-rotate(71deg)';
    navigator.clipboard.writeText(msg.content);
    setTimeout(() => {
        img.style.filter = 'none';
    }, 1000)
}

//获取历史记忆
async function getMemory(date: number) {
    const ar = await chatDb.getHistory(date);
    const temp = ar.map(a => a.content);
    return temp.join('|')
}

//重新发送信息
async function reSendMessage(id: string, fid: string) {
    const userMsg = await chatDb.one(fid);
    const aiMsg = await chatDb.one(id);
    if (!userMsg || !aiMsg) {
        return
    }
    const msgDiv = chatMessages.querySelector(`[data-id='${id}']`);
    if (!msgDiv) {
        return
    }
    msgDiv.setAttribute('data-done', '0');

    sendButton.setAttribute('disabled', 'true');
    messageInput.setAttribute('disabled', 'true');

    const newAiMsg = { ...aiMsg };

    newAiMsg.content = '思考中...';
    newAiMsg.done = false;

    const arg: MessageSendArg = {
        data: newAiMsg,
        prompt: userMsg.content,
        memory: await getMemory(aiMsg.date),
    }
    vscode.postMessage({ type: 'sendMessage', data: arg });
    //本地
    onPutMessage(newAiMsg, false);
}

// 发送消息函数
async function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText) return;
    sendButton.setAttribute('disabled', 'true');
    messageInput.setAttribute('disabled', 'true');
    // 用户消息
    const userMsg: ChatDetails = {
        id: uuidv4(),
        title: messageText.substring(0, 16),
        content: messageText,
        done: true,
        date: Date.now(),
        role: "user",
        fid: '',
        conversationId: window.initConfig.conversation.id
    }
    pushMessage(userMsg)

    // AI消息
    const aiMsg: ChatDetails = {
        id: uuidv4(),
        title: '',
        done: false,
        content: 'Thinking...',
        date: Date.now(),
        role: "ai",
        fid: userMsg.id,
        conversationId: window.initConfig.conversation.id
    }

    // 清空输入框
    messageInput.value = '';

    const arg: MessageSendArg = {
        data: aiMsg,
        prompt: messageText,
        memory: await getMemory(aiMsg.date),
    }

    // console.log(arg.memory)

    vscode.postMessage({ type: 'sendMessage', data: arg });

    //进入本地
    pushMessage(aiMsg, true)
}

// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
    addCopyButtonForCode();
}

function addCopyButtonForCode() {
    document.querySelectorAll('pre > code').forEach((codeBlock) => {
        const pre = codeBlock.parentNode as HTMLElement;

        // 创建复制按钮
        const button = document.createElement('button');
        button.className = 'copy-btn';
        button.innerText = 'Copy';

        // 点击复制
        button.addEventListener('click', () => {
            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                button.innerText = 'Copied!';
                setTimeout(() => button.innerText = 'Copy', 1200);
            });
        });

        // pre 元素相对定位，按钮绝对定位
        pre.style.position = 'relative';
        pre.appendChild(button);
    });

}

// 设置聊天模式
function setChatMode() {
    vscode.postMessage({ type: 'setChatMode', data: undefined });
}

// 事件监听
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
messageInput.addEventListener('input', () => {
    if (messageInput.value.trim()) {
        sendButton.removeAttribute('disabled');
    } else {
        sendButton.setAttribute('disabled', 'true');
    }
})

// 初始化
window.addEventListener('load', () => {
    messageInput.focus();
});

(window as any)['reSendMessage'] = reSendMessage;
(window as any)['copyMsgContent'] = copyMsgContent;
(window as any)['setChatMode'] = setChatMode;

activeDocument.textContent = getFileName(window.initConfig.activeDocument || '');

chatDb.init().then(() => {
    return chatDb.getAll(window.initConfig.conversation.id)
}).then(res => {
    res.forEach(chat => {
        pushMessage(chat, true);
    })
})
