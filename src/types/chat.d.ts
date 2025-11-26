interface ICatChatResult{
    
}

type ChatDetailsRole = 'ai'|'user'

interface ChatDetails{
    id: string
    title: string
    done?: boolean
    content: string
    date: number
    role: ChatDetailsRole
    fid: string
}

interface InitConfig{
    baseUrl: string
    isDark: boolean
    activeDocument?: string
}

declare const initConfig:InitConfig;