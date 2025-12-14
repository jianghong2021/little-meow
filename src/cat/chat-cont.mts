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

const state = {
    data: [] as ChatDetails[]
}

// 获取DOM元素
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;
const chatMessages = document.getElementById('chat-messages') as HTMLElement;
const activeDocumentBox = document.querySelector('#activeDocument') as HTMLElement;
const activeDocument = activeDocumentBox.querySelector('span') as HTMLElement;

function onmessage(e: MessageEvent) {
    const { type, data } = e.data;
    switch (type) {
        case 'onPutMessage':
            onServerPutMessage(data);
            break
        case 'onAnswer':
            onAnswer(data);
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

    console.log(file)
    if(file){
        activeDocumentBox.style.display = 'flex';
    }else{
        activeDocumentBox.style.display = 'none';
    }
}

function clearHistory() {
    chatDb.clear(window.initConfig.conversation.id);

    vscode.postMessage({ type: 'reload', data: undefined });
}

function pushMessage(msg: ChatDetails, onlyRender = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', msg.role);
    msgDiv.setAttribute('data-status', msg.status);
    msgDiv.setAttribute('data-id', msg.id);
    const text = marked.parse(msg.content);
    if (msg.status === 'ended') {
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
    } else if (msg.status === 'waiting') {
        msgDiv.innerHTML = `<div class="msg waiting">
            <img src="${window.initConfig.baseUrl}/icons/loading${window.initConfig.isDark ? '-dark' : ''}.svg"/>
        </div>`;
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

function getStatusMsgs(id: string) {
    return state.data.find(x => x.id === id);
}

function updateStatusMsgs(msg: ChatDetails) {
    const index = state.data.findIndex(x => x.id == msg.id);
    if (index == -1) {
        state.data.push({ ...msg });
        return;
    }
    const m = { ...state.data[index] };
    Object.assign(m, msg);
    state.data.splice(index, 1, m);
}

function onServerPutMessage(msg: ChatDetails) {
    const index = state.data.findIndex(x => x.id == msg.id);
    if (index == -1) {
        console.log('信息不存在', msg)
        return;
    }
    const m = { ...state.data[index] };
    if (msg.status === 'answering' || msg.content.trim() === '') {
        m.content += msg.content;
    } else {
        m.content = msg.content;
    }
    m.status = msg.status;
    state.data.splice(index, 1, m);
    onPutMessage(m, true);
}

function onPutMessage(msg: ChatDetails, reset = true) {
    const msgDiv = chatMessages.querySelector(`[data-id='${msg.id}']`);
    if (msgDiv) {
        //更新
        const text = marked.parse(msg.content);
        msgDiv.setAttribute('data-done', msg.status);

        if (msg.status === 'ended') {
            msgDiv.innerHTML = `
        <div class="msg">${text}</div>
        <div class="message-footer" style="display:${msg.status === 'ended' ? 'flex' : 'none'}">
            <div class="btn-icon" style="display:${msg.role == 'ai' ? 'flex' : 'none'}">
                <img src="${window.initConfig.baseUrl}/icons/copy${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="copyMsgContent(this,'${msg.id}')"/>
                <img src="${window.initConfig.baseUrl}/icons/refresh${window.initConfig.isDark ? '-dark' : ''}.svg" onclick="reSendMessage('${msg.id}','${msg.fid}')"/>
            </div>
            <span class="message-time">${formatTimeAgo(msg.date)}<span>
        </div>
        `;

        } else if (msg.status === 'waiting') {
            msgDiv.innerHTML = `<div class="msg waiting">
            <img src="${window.initConfig.baseUrl}/icons/loading${window.initConfig.isDark ? '-dark' : ''}.svg"/>
        </div>`;
        } else {
            msgDiv.innerHTML = `<div class="msg">${text}</div>`;
        }

        hljs.highlightAll();
    } else {
        //新增
        pushMessage(msg)
    }
    if (msg.status === 'ended') {
        chatDb.addOrUpdate(msg);
    }
    if (reset) {
        sendButton.removeAttribute('disabled');
        messageInput.removeAttribute('disabled');
    }

}

function onAnswer(msg: ChatDetails) {
    const index = state.data.findIndex(x => x.id == msg.id);
    const newMsg = state.data[index] || msg;
    newMsg.content += msg.content;
    newMsg.status = msg.status;
    state.data.splice(index, 1, newMsg);
    onPutMessage(newMsg);
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

    newAiMsg.content = '';
    newAiMsg.status = 'waiting';

    const arg: MessageSendArg = {
        data: newAiMsg,
        prompt: userMsg.content,
        memory: await getMemory(aiMsg.date),
    }

    updateStatusMsgs(newAiMsg);
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
        status: 'ended',
        date: Date.now(),
        role: "user",
        fid: '',
        conversationId: window.initConfig.conversation.id
    }
    updateStatusMsgs(userMsg);
    pushMessage(userMsg);

    // AI消息
    const aiMsg: ChatDetails = {
        id: uuidv4(),
        title: '',
        status: 'waiting',
        content: '',
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

    //进入本地
    state.data.push(aiMsg);
    pushMessage(aiMsg, true);
    updateStatusMsgs(aiMsg);
    vscode.postMessage({ type: 'sendMessage', data: arg });
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

function setModel(val:string){
    vscode.postMessage({ type: 'setModel', data: val });
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
(window as any)['setModel'] = setModel;

activeDocument.textContent = getFileName(window.initConfig.activeDocument || '');

chatDb.init().then(() => {
    return chatDb.getAll(window.initConfig.conversation.id)
}).then(res => {
    state.data = res;
    res.forEach(chat => {
        pushMessage(chat, true);
    })
})
