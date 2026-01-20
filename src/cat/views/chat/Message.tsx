import { Show, createEffect, createSignal } from "solid-js"
import { formatTimeAgo,formatTimestamp } from "../../../utils/date"
import { ChatDb } from '../../../data/ChatDb';
import { marked } from 'marked';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import { UiChatDetails } from "../chat-ui";

interface Props {
    msg: UiChatDetails
    chatDb: ChatDb
    index: number
    reSendMessage: (id: string, fid: string) => void
    scrollToBottom: () => void
    deleteMessage: (index: number) => void
}

hljs.registerLanguage('javascript', javascript);

export default function ({ index,msg,deleteMessage, scrollToBottom, reSendMessage }: Props) {

    const [content, setContent] = createSignal('');

    const copyIcon = `${window.initConfig.baseUrl}/icons/copy${window.initConfig.isDark ? '-dark' : ''}.svg`;
    const refreshIcon = `${window.initConfig.baseUrl}/icons/refresh${window.initConfig.isDark ? '-dark' : ''}.svg`;
    const deleIcon = `${window.initConfig.baseUrl}/icons/delete${window.initConfig.isDark ? '-dark' : ''}.svg`;

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

    const addCopyButtonForCode = () => {
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

    const reRender = () => {
        if (msg.status() !== 'answering') {
            hljs.highlightAll();
            addCopyButtonForCode();
        }

        scrollToBottom();
    }

    createEffect(async () => {
        const str = await marked.parse(msg.content());
        setContent(str);

        setTimeout(reRender, 50)
    })

    return <div class={`message ${msg.role}`} data-id={msg.id} data-status={msg.status}>
        <Show when={msg.reasoningContent() !== undefined && msg.reasoningContent() !== ''}>
            <details class="msg-reasoning" open={msg.status() === 'answering'}>
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
                <div class="btn-icon" style={{ display: msg.role == 'assistant' ? 'flex' : 'none' }}>
                    <img src={copyIcon} onclick={(e) => copyMsgContent(e.target as any, msg.id)} />
                    <img src={refreshIcon} onclick={() => reSendMessage(msg.id, msg.fid)} />
                    <img src={deleIcon} onclick={() => deleteMessage(index)} />
                </div>
                <span class="message-time" title={formatTimestamp(msg.date)}>{formatTimeAgo(msg.date)}</span>
            </div>
        </Show>
    </div>
}