
type ChatConfigMode = 'norm' | 'code' | 'agent'

type DeepseekModels = 'deepseek-chat' | 'deepseek-reasoner';
type ClaudeModels = 'claude-haiku-3' | 'claude-haiku-3-5';
type ChatGptModels = 'gpt-5-mini' | 'gpt-5.2';

type ChatModel = {
    type: 'deepseek' | 'claude' | 'gpt',
    name: DeepseekModels | ClaudeModels | ChatGptModels
    label: string
}

interface ChatConfig {
    mode: ChatConfigMode
    thinking: boolean
    model: ChatModel
}