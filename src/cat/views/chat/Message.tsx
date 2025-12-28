import { Accessor, Show, createEffect, createSignal, onMount } from "solid-js"
import { formatTimeAgo } from "../../../utils/date"
import { ChatDb } from '../../../data/ChatDb';
import { marked } from 'marked';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import { UiChatDetails } from "../chat-ui";

interface Props {
    msg: UiChatDetails
    chatDb: ChatDb
    reSendMessage: (id: string, fid: string) => void
    scrollToBottom: () => void
}

hljs.registerLanguage('javascript', javascript);

export default function ({ msg, scrollToBottom, reSendMessage }: Props) {

    const [content, setContent] = createSignal('');

    const copyIcon = `${window.initConfig.baseUrl}/icons/copy${window.initConfig.isDark ? '-dark' : ''}.svg`;
    const refreshIcon = `${window.initConfig.baseUrl}/icons/refresh${window.initConfig.isDark ? '-dark' : ''}.svg`;

    const copyMsgContent = async (img: HTMLElement, cont: string) => {
        if (!cont) {
            return
        }
        img.style.filter = 'sepia(1) saturate(10000%) hue-rotate(71deg)';
        navigator.clipboard.writeText(msg.content());
        setTimeout(() => {
            img.style.filter = 'none';
        }, 1000)
    }

    const WaitingEl = <div class="msg waiting">
        <img src={`${window.initConfig.baseUrl}/icons/loading${window.initConfig.isDark ? '-dark' : ''}.svg`} />
    </div>

    createEffect(async () => {
        const str = await marked.parse(msg.content());
        setContent(str);

        setTimeout(scrollToBottom,50)
    })

    onMount(() => {
        hljs.highlightAll();
        scrollToBottom();
    })

    return <div class={`message ${msg.role}`} data-id={msg.id} data-status={msg.status}>
        <Show when={msg.reasoningContent() !== undefined && msg.reasoningContent() !== ''}>
            <details class="msg-reasoning">
                <summary>
                    {I18nUtils.t('ai.chat.thinking_cont')}
                </summary>
                {msg.reasoningContent()}
            </details>
        </Show>
        <Show when={msg.status() !== 'waiting'} fallback={WaitingEl}>
            <div class="msg" innerHTML={content()}></div>
        </Show>
        <Show when={msg.status() === 'ended'}>
            <div class="message-footer" style="display:${msg.status === 'ended' ? 'flex' : 'none'}">
                <div class="btn-icon" style={{display:msg.role == 'assistant' ? 'flex' : 'none'}}>
                    <img src={copyIcon} onclick={(e) => copyMsgContent(e.target as any, msg.id)} />
                    <img src={refreshIcon} onclick={() => reSendMessage(msg.id, msg.fid)} />
                </div>
                <span class="message-time">{formatTimeAgo(msg.date)}</span>
            </div>
        </Show>
    </div>
}