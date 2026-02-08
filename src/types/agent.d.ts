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

interface AgentStatus {
    msg?: AgentMessage;
    waiting: boolean
}

interface AgentCommPrompt{
    id: string
    workspace: string
    prompt: string
}

interface ConsoleMessage {
    id: string;
    type: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'command' | 'system';
    content: string;
    workspace: string
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
    loadHistory: (data: ConsoleMessage[])=>void
}

declare const agentConsole: AgentConsole