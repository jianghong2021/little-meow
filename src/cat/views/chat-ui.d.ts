import { Accessor, Setter } from "solid-js"

export interface UiChatDetails {
    id: string
    conversationId: string
    title: string
    reasoningContent: Accessor<string>
    setReasoningContent: Setter<string>
    date: number
    role: GeneralMessageRole
    fid: string
    content: Accessor<string>
    setContent: Setter<string>
    status: Accessor<ChatDetailsStatus>
    setStatus: Setter<ChatDetailsStatus>
}