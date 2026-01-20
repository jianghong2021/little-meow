type AgentInstruction = 'editDocument'|'createDocument'

interface AgentMessage {
    content: string
    description: string
    instruction: AgentInstruction
    error?: string
}

interface InitConfig {
    msg?: AgentMessage
}

interface AgetnStatus {
    msg?: AgentMessage;
    waiting: boolean
    history: ConsoleMessage[]
}

interface ConsoleMessage {
    id: string;
    type: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'command' | 'system';
    content: string;
    date: number;
    source?: string;
    data?: any;
}

interface AgentConsole {
    log: (content: string, data?: any, cache?: boolean) => void
    info: (content: string, data?: any, cache?: boolean) => void
    error: (content: string, data?: any, cache?: boolean) => void
    warn: (content: string, data?: any, cache?: boolean) => void
    debug: (content: string, data?: any, cache?: boolean) => void
    clear: () => void
    pause: () => void
    resume: () => void
    getMessages: () => ConsoleMessage[]
    setMessages: (ar: ConsoleMessage[])=>void
}

declare const agentConsole: AgentConsole