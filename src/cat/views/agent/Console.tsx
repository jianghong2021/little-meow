// components/Console.tsx
import { createSignal, createEffect, onMount, onCleanup, For, createMemo, Show, batch } from 'solid-js';
import { marked } from 'marked';

export interface ConsoleProps {
    messages?: ConsoleMessage[];
    onClear?: () => void;
    onExecute?: (command: string) => void;
    onFilterChange?: (type: string) => void;
    onInit?: () => void;
    onInsert?: (msg: ConsoleMessage) => void
    maxMessages?: number;
    showTimestamp?: boolean;
    showSource?: boolean;
    autoScroll?: boolean;
    className?: string;
    placeholder?: string
}

export function Console(props: ConsoleProps) {
    // 状态管理
    const [input, setInput] = createSignal('');
    const [messages, setMessages] = createSignal<ConsoleMessage[]>(props.messages || []);
    const [filter, setFilter] = createSignal<string>('all');
    const [isAutoScroll, setIsAutoScroll] = createSignal(props.autoScroll !== false);
    const [showFilters, setShowFilters] = createSignal(true);
    const [isPaused, setIsPaused] = createSignal(false);
    const [scrollRef, setScrollRef] = createSignal<HTMLDivElement>();
    const [controlsShow, setControlsShow] = createSignal(false);

    // 消息计数器
    const messageCounts = createMemo(() => {
        const msgs = messages();
        return {
            all: msgs.length,
            log: msgs.filter(m => m.type === 'log').length,
            info: msgs.filter(m => m.type === 'info').length,
            warn: msgs.filter(m => m.type === 'warn').length,
            error: msgs.filter(m => m.type === 'error').length,
            debug: msgs.filter(m => m.type === 'debug').length,
            command: msgs.filter(m => m.type === 'command').length,
        };
    });

    // 过滤后的消息
    const filteredMessages = createMemo(() => {
        const type = filter();
        if (type === 'all') return messages();
        return messages().filter(msg => msg.type === type);
    });

    const scrollToBottom = () => {
        const container = scrollRef();
        if (container) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    // 添加消息
    const addMessage = async (type: ConsoleMessage['type'], content: string, data?: any, cache = true) => {
        if (isPaused()) return;

        const text = await marked.parse(content);
        const newMessage: ConsoleMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type,
            content: text,
            date: Date.now(),
            data
        };

        if (cache) {
            props.onInsert?.(newMessage);
        }

        batch(() => {
            setMessages(prev => {
                const newMessages = [...prev, newMessage];
                if (props.maxMessages && newMessages.length > props.maxMessages) {
                    return newMessages.slice(-props.maxMessages);
                }
                return newMessages;
            });

            scrollToBottom()
        });
    };

    const executeCommand = () => {
        const cmd = input().trim();
        if (!cmd) return;

        addMessage('command', `${cmd}`);

        if (props.onExecute) {
            props.onExecute(cmd);
        }

        setInput('');
    };

    const clearConsole = () => {
        setMessages([]);
        if (props.onClear) {
            props.onClear();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            executeCommand();
        } else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            clearConsole();
        } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            clearConsole();
        }
    };

    createEffect(() => {
        if (isAutoScroll() && scrollRef() && messages().length > 0) {
            scrollToBottom()
        }
    });

    const api = {
        log: (content: string, data?: any, cache = true) => addMessage('log', content, data, cache),
        info: (content: string, data?: any, cache = true) => addMessage('info', content, data, cache),
        warn: (content: string, data?: any, cache = true) => addMessage('warn', content, data, cache),
        error: (content: string, data?: any, cache = true) => addMessage('error', content, data, cache),
        debug: (content: string, data?: any, cache = true) => addMessage('debug', content, data, cache),
        clear: clearConsole,
        getMessages: () => messages(),
        setMessages,
        pause: () => setIsPaused(true),
        resume: () => setIsPaused(false),
    };

    onMount(() => {
        (window as any).agentConsole = api;
        props.onInit?.();
        console.log('console init')

    });

    onCleanup(() => {
        (window as any).agentConsole = undefined;
    });

    return (
        <div class={`console-container ${props.className || ''}`}>

            <Show when={controlsShow()}>
                <div class="console-header">

                    <Show when={showFilters()}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {['all', 'log', 'info', 'warn', 'error', 'debug', 'command'].map(type => (
                                <button
                                    class={`filter-button ${filter() === type ? 'active' : ''}`}
                                    onClick={() => setFilter(type)}
                                >
                                    {type}
                                    <span class={`badge badge-${type}`}>
                                        {messageCounts()[type as keyof typeof messageCounts] || 0}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Show>


                    <div class="console-controls">
                        <button
                            class="icon-button"
                            onClick={() => setIsPaused(!isPaused())}
                            title={isPaused() ? '恢复输出' : '暂停输出'}
                        >
                            {isPaused() ? '▶️' : '⏸️'}
                        </button>
                        <button
                            class="icon-button"
                            onClick={() => setIsAutoScroll(!isAutoScroll())}
                            title={isAutoScroll() ? '关闭自动滚动' : '开启自动滚动'}
                        >
                            {isAutoScroll() ? '🔒' : '🔓'}
                        </button>
                        <button
                            class="icon-button"
                            onClick={() => setShowFilters(!showFilters())}
                            title={showFilters() ? '隐藏过滤器' : '显示过滤器'}
                        >
                            {showFilters() ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <button
                            class="icon-button"
                            onClick={clearConsole}
                            title="清空控制台 (Ctrl+K/Ctrl+L)"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            </Show>

            {/* 消息区域 */}
            <div
                class="console-messages"
                ref={setScrollRef}
                onScroll={(e) => {
                    const target = e.target as HTMLDivElement;
                    const isAtBottom =
                        target.scrollHeight - target.scrollTop - target.clientHeight < 1;
                    if (isAutoScroll() && !isAtBottom) {
                        setIsAutoScroll(false);
                    }
                }}
            >
                <For each={filteredMessages()}>
                    {(msg) => (
                        <div class={`message message-${msg.type}`}>
                            <div style={{ display: 'flex', 'align-items': 'flex-start' }}>
                                <Show when={props.showTimestamp !== false}>
                                    <span class="message-timestamp">
                                        @cat&gt;
                                    </span>
                                </Show>

                                <Show when={props.showSource && msg.source}>
                                    <span class="message-source">[{msg.source}]</span>
                                </Show>

                                <span style={{ flex: 1 }}>
                                    {msg.content}
                                </span>
                            </div>

                            <Show when={msg.data}>
                                <div class='msg-data'>
                                    {JSON.stringify(msg.data, null, 2)}
                                </div>
                            </Show>
                        </div>
                    )}
                </For>

                <Show when={filteredMessages().length === 0}>
                    <div style={{
                        'text-align': 'center',
                        padding: '20px',
                        color: 'var(--vscode-descriptionForeground)',
                        'font-style': 'italic'
                    }}>
                        没有消息
                    </div>
                </Show>
            </div>

            {/* 输入区域 */}
            <div class="console-input-area">
                <input
                    type="text"
                    class="console-input"
                    value={input()}
                    onInput={(e) => setInput(e.currentTarget.value.trim())}
                    onKeyDown={handleKeyDown}
                    placeholder={props.placeholder}
                />
            </div>
        </div>
    );
}