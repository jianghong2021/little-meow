import { createSignal, For, onMount, Show } from "solid-js";
import { formatTimeAgo } from "../../../utils/date";

export default function (props: {
    onSelect: (id: string) => void
}) {
    const baseUrl = window.initConfig.baseUrl;
    const [conversations, setConversations] = createSignal<ConversationDetails[]>([]);

    onMount(() => {
        window.addEventListener('message', onMessage);
        vscode.postMessage({ type: 'getConversations' });
    });

    const onMessage = (e: MessageEvent) => {
        const { type, data } = e.data;
        if (type === 'onConversations') {
            setConversations(data);
        }
    };

    return (
        <div class="history-container">
            <div class="history-list">
                <For each={conversations()}>
                    {(conv) => (
                        <div 
                            class={`history-item ${conv.selected ? 'active' : ''}`}
                            onClick={() => props.onSelect(conv.id)}
                        >
                            <div class="history-item-title">{conv.title}</div>
                            <div class="history-item-date">{formatTimeAgo(conv.date)}</div>
                        </div>
                    )}
                </For>
                <Show when={conversations().length === 0}>
                    <div class="empty-history">
                        {I18nUtils.t('chat.history.empty', 'No history yet')}
                    </div>
                </Show>
            </div>
        </div>
    );
}
