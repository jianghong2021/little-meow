import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { marked } from 'marked';
import { Console } from "./agent/Console";

export default function () {
    const [message, setMessage] = createSignal<AgentMessage>({
        content: "",
        compare: ""
    });

    const [waiting, setWaiting] = createSignal(false);

    const sendMessage = (prompt: string) => {
        if (waiting() || prompt.trim() == '') {
            return
        } else if (prompt.length <= 4) {
            agentConsole.warn(I18nUtils.t('agent.cmd.tips'));
            return
        }
        agentConsole.warn(I18nUtils.t('agent.input_waiting'));
        setWaiting(true);
        vscode.postMessage({ type: 'sendMessage', data: prompt });
    }

    const getPlacholder = () => {
        if (waiting()) {
            return I18nUtils.t('ai.chat.waiting')
        }
        return I18nUtils.t('agent.input_placeholder')
    }

    const cancelMessage = () => {
        setMessage({
            content: '',
            compare: ''
        })
    }

    const confirmMessage = () => {
        if (message().content.trim() == '' || message().error) {
            agentConsole.log(I18nUtils.t('agent.cmd.none_tips'))
            return
        }
        vscode.postMessage({ type: 'confirmMessage', data: message() });
        setMessage({
            content: '',
            compare: message().compare
        })
    }

    const onServerPutMessage = async (msg?: AgentMessage) => {
        if (!msg) {
            return
        }
        setWaiting(false);
        setMessage({
            content: msg.content,
            compare: await marked.parse(msg.compare),
            error: msg.error
        });
        if (msg.error) {
            agentConsole.error(msg.error);
        } else {
            agentConsole.info(msg.compare);
            agentConsole.warn(I18nUtils.t('agent.confirm.tips'));
        }
    }

    const onStatus = (e: AgetnStatus) => {
        agentConsole.setMessages(e.history || []);
        if (e.msg) {
            onServerPutMessage(e.msg);
        }
        setWaiting(e.waiting);
    }

    const clearHistory = () => {
        agentConsole.clear();
    }

    const inserHistory = (msg: ConsoleMessage) => {
        vscode.postMessage({ type: 'inserHistory', data: msg });
    }

    const onmessage = (e: MessageEvent) => {
        const { type, data } = e.data;
        switch (type) {
            case 'onPutMessage':
                onServerPutMessage(data);
                break
            case 'onStatus':
                onStatus(data);
                break
            case 'clearHistory':
                clearHistory();
        }
    }

    const onExecute = (command: string) => {
        switch (command) {
            case 'y':
                confirmMessage();
                break
            case 'c':
                cancelMessage();
                break
            default:
                sendMessage(command)
        }
    }

    const onConsoleInit = () => {
        agentConsole.log(I18nUtils.t('ai.chat.input_placeholder'), undefined, false);
    }

    onMount(() => {
        window.addEventListener('message', onmessage);
        vscode.postMessage({ type: 'getStatus', data: undefined });
    })

    onCleanup(() => {
        window.removeEventListener('message', onmessage);
    })

    return <div class="panel-container">
        <Console onExecute={onExecute} onInit={onConsoleInit} onInsert={inserHistory} placeholder={getPlacholder()} />
    </div>
}