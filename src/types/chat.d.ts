interface ICatChatResult {

}

type ChatDetailsRole = 'ai' | 'user'

interface ChatDetails {
    id: string
    conversationId: string
    title: string
    status: 'waiting' | 'answering' | 'ended'
    content: string
    date: number
    role: ChatDetailsRole
    fid: string
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
    memory: string
    data: ChatDetails
}