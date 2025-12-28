import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { marked } from 'marked';

export default function () {

    const [inputText, setInputText] = createSignal('');
    const [message, setMessage] = createSignal<AgentMessage>({
        content: "",
        compare: ""
    });
    const [waiting, setWaiting] = createSignal(false);

    const sendMessage = () => {
        setWaiting(true);
        vscode.postMessage({ type: 'sendMessage', data: inputText() });
        setInputText('');
    }

    const onEnterPress = (e: KeyboardEvent) => {
        if (e.code.toLowerCase() !== 'enter') {
            return
        }
        e.preventDefault();
        if (inputText().trim() == '') {
            return
        }
        sendMessage();
    }

    const getPlacholder = () => {
        if (waiting()) {
            return I18nUtils.t('ai.chat.waiting')
        }
        return I18nUtils.t('ai.chat.input_placeholder')
    }

    const cancelMessage = ()=>{
        setMessage({
            content: '',
            compare: ''
        })
    }

    const confirmMessage = ()=>{
        vscode.postMessage({ type: 'confirmMessage', data: message() });
        setMessage({
            content: '',
            compare: message().compare
        })
    }

    const onServerPutMessage = async (msg: AgentMessage) => {
        setWaiting(false);
        setMessage({
            content: msg.content,
            compare: await marked.parse(msg.compare),
            error: msg.error
        });
    }

    const onmessage = (e: MessageEvent) => {
        const { type, data } = e.data;
        switch (type) {
            case 'onPutMessage':
                onServerPutMessage(data);
                break
        }
    }

    onMount(() => {
        window.addEventListener('message', onmessage);
    })

    onCleanup(() => {
        window.removeEventListener('message', onmessage);
    })

    return <div class="panel-container">
        <div class="panel-messages">
            <div innerHTML={message().compare}></div>
            <Show when={message().error}>
                <div class="error" innerHTML={message().error}></div>
            </Show>
            <Show when={message().content.trim() !== ''}>
                <div class="contr">
                    <button class="btn" onclick={()=>confirmMessage()}>
                        {I18nUtils.t('agent.confirm.yes')}
                    </button>
                    <button class="btn cancel" onclick={()=>cancelMessage()}>
                        {I18nUtils.t('agent.confirm.no')}
                    </button>
                </div>
            </Show>
        </div>
        <div class="panel-input-container">
            <textarea class="message-input" disabled={waiting()} value={inputText()} placeholder={getPlacholder()} autocomplete="off" rows={2} oninput={e => setInputText(e.target.value.trim())} onkeypress={e => onEnterPress(e)}></textarea>
        </div>
    </div>
}