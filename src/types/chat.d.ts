type GeneralMessageRole = 'system' | 'user' | 'assistant' | 'tool'

interface ChatDetails {
    id: string
    conversationId: string
    title: string
    status: 'waiting' | 'answering' | 'ended'
    content: string
    date: number
    role: GeneralMessageRole
    fid: string
}



interface GeneralMessage {
    role: GeneralMessageRole
    content: string
}

interface InitConfig {
    baseUrl: string
    isDark: boolean
    activeDocument?: string
    conversation: ConversationDetails
}

interface Window {
    initConfig: InitConfig
}

interface MessageSendArg {
    prompt: string
    memory: ChatDetails[]
    data: ChatDetails
}