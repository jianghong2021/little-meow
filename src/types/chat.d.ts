type GeneralMessageRole = 'system' | 'user' | 'assistant' | 'tool'
type ChatDetailsStatus = 'waiting' | 'answering' | 'ended'
interface ChatDetails {
    id: string
    conversationId: string
    title: string
    status: ChatDetailsStatus
    content: any
    reasoningContent?: string
    date: number
    role: GeneralMessageRole
    fid: string
}

interface GeneralMessage {
    role: GeneralMessageRole
    content: string
}

interface SseGeneralMessage{
    content: string
    reasoningContent?: string
}

interface InitConfig {
    baseUrl: string
    isDark: boolean
    activeDocument?: string
    conversation: ConversationDetails
    models: ChatModel[]
    config: ChatConfig
    platforms: ModePlatform[]
}

interface Window {
    initConfig: InitConfig
}

interface MessageSendArg {
    prompt: string
    memory: ChatDetails[]
    data: ChatDetails
}