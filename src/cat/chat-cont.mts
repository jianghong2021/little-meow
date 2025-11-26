import { v4 as uuidv4 } from 'uuid';
import { ChatDb } from '../data/ChatDb.js';
import { marked } from 'marked';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';

const vscode = acquireVsCodeApi();
window.addEventListener('message', onmessage);

hljs.registerLanguage('javascript', javascript);

const chatDb = new ChatDb();

// 获取DOM元素
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;
const chatMessages = document.getElementById('chat-messages') as HTMLElement;
const activeDocument = document.getElementById('activeDocument') as HTMLElement;

function onmessage(e: MessageEvent) {
    const { type, data } = e.data;
    console.log('msg', type, data)
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
    return temp[temp.length - 1].replaceAll(/\s/g, '');
}

function onDocumentChange(file?: string) {
    window.initConfig.activeDocument = file;
    activeDocument.textContent = getFileName(window.initConfig.activeDocument || '');
}

function clearHistory() {
    chatDb.clear();
    chatMessages.innerHTML = '';
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
                <img src="${window.initConfig.baseUrl}/copy${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="copyMsgContent(this,'${msg.id}')"/>
                <img src="${window.initConfig.baseUrl}/refresh${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="reSendMessage('${msg.id}','${msg.fid}')"/>
            </div>
            <span class="message-time">${getCurrentTime(msg.date)}<span>
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
        const id = msgDiv.getAttribute('data-id') || '';
        const text = marked.parse(msg.content);
        msgDiv.setAttribute('data-done', msg.done ? '1' : '0');

        msgDiv.innerHTML = `
        <div class="msg">${text}</div>
        <div class="message-footer">
            <div class="btn-icon" style="display:${(msg.role == 'ai' && msg.done) ? 'flex' : 'none'}">
                <img src="${window.initConfig.baseUrl}/copy${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="copyMsgContent(this,'${msg.id}')"/>
                <img src="${window.initConfig.baseUrl}/refresh${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="reSendMessage('${msg.id}','${msg.fid}')"/>
            </div>
            <span class="message-time">${getCurrentTime(msg.date)}<span>
        </div>
        `;
        chatDb.insert(msg);
        hljs.highlightAll();
        scrollToBottom();
    } else {
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

//重新发送信息
async function reSendMessage(id: string, fid: string) {
    const msg = await chatDb.one(fid);
    if (!msg) {
        return
    }
    const msgDiv = chatMessages.querySelector(`[data-id='${id}']`);
    if (!msgDiv) {
        return
    }
    msgDiv.setAttribute('data-done', '0');

    sendButton.setAttribute('disabled', 'true');
    messageInput.setAttribute('disabled', 'true');

    const newMsg = { ...msg };

    newMsg.content = '思考中...';
    newMsg.date = Date.now();
    newMsg.done = false;
    newMsg.id = id;
    newMsg.role = 'ai';
    newMsg.fid = fid;

    onPutMessage(newMsg, false);

    vscode.postMessage({ type: 'sendMessage', data: { id, fid, prompt: msg.content } });
}

// 发送消息函数
function sendMessage() {
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
        fid: ''
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
        fid: userMsg.id
    }
    pushMessage(aiMsg, true)

    // 清空输入框
    messageInput.value = '';

    vscode.postMessage({ type: 'sendMessage', data: { id: aiMsg.id, fid: aiMsg.fid, prompt: messageText } });
}

// 获取当前时间
function getCurrentTime(time: number) {
    const now = new Date(time);
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
    addCopyButtonForCode()
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

activeDocument.textContent = getFileName(window.initConfig.activeDocument || '');

chatDb.init().then(() => {
    return chatDb.getAll()
}).then(res => {
    res.forEach(chat => {
        pushMessage(chat, true);
    })
})
