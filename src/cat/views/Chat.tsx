import { createSignal, For, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { ChatDb } from "../../data/ChatDb";
import Message from "./chat/Message";
import InputBox from "./chat/InputBox";
import { v4 as uuidv4 } from 'uuid';
import { getFileName } from "../../utils/file";
import { UiChatDetails } from "./chat-ui";
import Settings from "./chat/Settings";
import History from "./chat/History";
import Models from "./chat/Models";

const chatDb = new ChatDb();

export default function () {

    const [messages, setMessages] = createSignal<UiChatDetails[]>([]);
    let chatMessages: any;
    const [activeDocument, setActiveDocument] = createSignal({
        file: getFileName(window.initConfig.activeDocument || ''),
        show: window.initConfig.activeDocument ? true : false
    })

    const workspace = window.initConfig.workspace;
    const baseUrl = window.initConfig.baseUrl;

    const [resend, setResend] = createSignal(false);

    const [conversation, setConversation] = createSignal(window.initConfig.conversation);
    const [answering, setAnswering] = createSignal(false);

    const [config, setConfig] = createSignal(window.initConfig.config);
    const [emotion, setEmotion] = createSignal<PetEmotion>('happy');

    const [activeTab,setActiveTab] = createSignal('chat');

    const scrollToBottom = () => {
        if (resend()) {
            return
        }
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    const getMemory = (id: string, date: number) => {
        return chatDb.getHistory(conversation().id, id, date);
    }

    const createUiMsg = (x: ChatDetails) => {
        const [content, setContent] = createSignal<string>(x.content);
        const [status, setStatus] = createSignal<ChatDetailsStatus>(x.status);
        const [reasoningContent, setReasoningContent] = createSignal<string>(x.reasoningContent || '');
        const msg: UiChatDetails = {
            content,
            setContent,
            status, setStatus,
            reasoningContent,
            setReasoningContent,
            id: x.id,
            conversationId: x.conversationId,
            title: x.title,
            date: x.date,
            role: x.role,
            fid: x.fid
        }

        return msg;
    }

    const getDbMsg = (x: UiChatDetails) => {
        const m: ChatDetails = {
            id: x.id,
            conversationId: x.conversationId,
            title: x.title,
            status: x.status(),
            content: x.content(),
            date: x.date,
            role: x.role,
            fid: x.fid,
            workspace: workspace,
            reasoningContent: x.reasoningContent(),
        }

        return m
    }

    const updateStatusMsgs = (msg: ChatDetails) => {
        const data = messages();
        const index = data.findIndex(x => x.id == msg.id);
        if (index == -1) {
            setMessages(prev => [...prev, createUiMsg(msg)]);
            if (msg.role === 'user' || msg.status === 'ended') {
                chatDb.addOrUpdate(msg);
            }
            return;
        }

        if (msg.status === 'answering') {
            data[index].setContent(prev => prev + msg.content);
        } else if (msg.status !== 'waiting' && msg.content.trim() === '') {
            data[index].setContent(prev => prev + msg.content);
        } else {
            data[index].setContent(msg.content);
        }

        if (msg.reasoningContent?.trim() && msg.status === 'answering') {
            data[index].setReasoningContent(prev => prev + msg.reasoningContent);
        } else if (msg.status === 'waiting') {
            data[index].setReasoningContent(msg.reasoningContent || '');
        } else {
            data[index].setReasoningContent(prev => prev + (msg.reasoningContent || ''));
        }

        data[index].setStatus(msg.status);

        if (msg.role === 'user' || msg.status === 'ended') {
            chatDb.addOrUpdate(getDbMsg(data[index]));
        }
    }


    const reSendMessage = async (id: string, fid: string) => {
        if (answering()) {
            return
        }
        const userMsg = await chatDb.one(fid);
        const aiMsg = await chatDb.one(id);
        if (!userMsg || !aiMsg) {
            return
        }
        setEmotion('thinking');
        setResend(true);
        setAnswering(true);

        const newAiMsg = { ...aiMsg };

        newAiMsg.content = '';
        newAiMsg.reasoningContent = undefined;
        newAiMsg.status = 'waiting';

        const arg: MessageSendArg = {
            data: newAiMsg,
            prompt: userMsg.content,
            memory: await getMemory(userMsg.id, aiMsg.date),
        }

        updateStatusMsgs(newAiMsg);
        vscode.postMessage({ type: 'sendMessage', data: arg });
    }

    const sendMessage = async (text: string) => {
        if (!text) return;

        setResend(false);
        setAnswering(true);
        setEmotion('thinking');
        // 用户消息
        const userMsg: ChatDetails = {
            id: uuidv4(),
            title: text.substring(0, 16),
            content: text,
            status: 'ended',
            date: Date.now(),
            role: "user",
            fid: '',
            workspace,
            conversationId: conversation().id
        }
        updateStatusMsgs(userMsg);

        // AI消息
        const aiMsg: ChatDetails = {
            id: uuidv4(),
            title: '',
            status: 'waiting',
            content: '',
            date: Date.now(),
            role: "assistant",
            fid: userMsg.id,
            workspace,
            conversationId: conversation().id
        }
        //进入本地
        updateStatusMsgs(aiMsg);

        const arg: MessageSendArg = {
            data: aiMsg,
            prompt: text,
            memory: await getMemory(userMsg.id, aiMsg.date),
        }

        vscode.postMessage({ type: 'sendMessage', data: arg });
    }

    const onServerPutMessage = (msg: ChatDetails) => {
        const data = [...messages()];
        const index = data.findIndex(x => x.id == msg.id);
        if (index == -1) {
            console.log('信息不存在', msg)
            return;
        }
        if (msg.status === 'ended') {
            setEmotion('happy');
        }
        msg.workspace = workspace;
        updateStatusMsgs(msg);
        setAnswering(false);
    }

    const onAnswer = (msg: ChatDetails) => {
        setEmotion('speaking');
        updateStatusMsgs(msg);
    }

    const clearHistory = () => {
        chatDb.clear(conversation().id);
        vscode.postMessage({ type: 'reload', data: undefined });
    }

    const clearAllHistory = () => {
        chatDb.clearAll();
        vscode.postMessage({ type: 'reload', data: undefined });
    }

    const deleteMessage = (index: number) => {
        const msg = messages()[index];
        if (!msg) {
            return
        }
        msg.setStatus('waiting');
        const relatedId = msg.role === 'user'
            ? messages().find(x => x.fid === msg.id)?.id
            : undefined;
        chatDb.deleteMessage(msg.id, msg.fid || relatedId).then(() => {
            setMessages(prev => {
                return prev.filter(x => x.id !== msg.id && x.id !== msg.fid && x.id !== relatedId)
            })
        }).catch(() => {
            msg.setStatus('ended');
        })
    }

    const onDocumentChange = (file?: string) => {
        window.initConfig.activeDocument = file;
        const f = getFileName(window.initConfig.activeDocument || '');
        setActiveDocument({
            file: f,
            show: file ? true : false
        })

    }

    const onmessage = (e: MessageEvent) => {
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
            case 'clearAllHistory':
                clearAllHistory()
                break
            case 'onDocumentChange':
                onDocumentChange(data)
                break
            case 'showSettings':
                setActiveTab('settings');
                break
        }
    }

    const switchConversation = (id: string) => {
        vscode.postMessage({ type: 'switchConversation', data: id });
        setActiveTab('chat');
    }

    const init = () => {
        console.log(conversation())
        chatDb.getAll(conversation().id, workspace).then(res => {
            setMessages(res.map(x => {
                return createUiMsg(x)
            }));
        })
    }

    onMount(() => {
        window.addEventListener('message', onmessage);
        init();
    })

    onCleanup(() => {
        window.removeEventListener('message', onmessage);
    })

    return <div class="chat-container">
        <div class="chat-tabs">
            <div 
                class={`tab-item ${activeTab() === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
            >
                {I18nUtils.t('chat.tabs.chat', 'Chat')}
            </div>
            <div 
                class={`tab-item ${activeTab() === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
            >
                {I18nUtils.t('chat.tabs.history', 'History')}
            </div>
            <div 
                class={`tab-item ${activeTab() === 'models' ? 'active' : ''}`}
                onClick={() => setActiveTab('models')}
            >
                {I18nUtils.t('chat.tabs.models', 'Models')}
            </div>
            <div 
                class={`tab-item ${activeTab() === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
            >
                {I18nUtils.t('chat.tabs.settings', 'Settings')}
            </div>
        </div>

        <Switch>
            <Match when={activeTab() === 'chat'}>
                <div ref={chatMessages} class="chat-messages" id="chat-messages">
                    <div class="message assistant">
                        {I18nUtils.t('ai.chat.hello')}
                        <div class="message-time">{I18nUtils.t('ai.chat.now')}</div>
                    </div>
                    <For each={messages()}>
                        {
                            (msg, index) => <Message index={index()} msg={msg} chatDb={chatDb} scrollToBottom={scrollToBottom} reSendMessage={reSendMessage} deleteMessage={deleteMessage} />
                        }
                    </For>
                </div>
                <InputBox config={config} setConfig={setConfig} emotion={emotion} setEmotion={setEmotion} answering={answering} activeDocument={activeDocument()} conversation={conversation} sendMessage={sendMessage} />
            </Match>
            <Match when={activeTab() === 'history'}>
                <History onSelect={switchConversation} />
            </Match>
            <Match when={activeTab() === 'models'}>
                <Models onBack={() => setActiveTab('chat')} />
            </Match>
            <Match when={activeTab() === 'settings'}>
                <Settings
                    onBack={() => setActiveTab('chat')}
                />
            </Match>
        </Switch>
    </div>
    }