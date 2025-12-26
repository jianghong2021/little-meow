
type ChatConfigMode = 'norm' | 'code' | 'agent'

type DeepseekModels = 'deepseek-chat' | 'deepseek-reasoner';
type ClaudeModels = 'claude-haiku-3' | 'claude-haiku-3-5';
type ChatGptModels = 'gpt-5-mini' | 'gpt-5.2';
type DoubaoModels = 'doubao-seed-1-8-251215'|'doubao-seed-code-preview-251028'|'doubao-seed-1-6-lite-251015'

type ModeAbility = 'text' | 'image' | 'video';
type ModePlatform = 'deepseek' | 'claude' | 'gpt' | 'doubao';

type ChatModelId = DeepseekModels | ClaudeModels | ChatGptModels | DoubaoModels;

type ChatModel = {
    platform: ModePlatform
    name: ChatModelId
    label: string
    ability: ModeAbility
}

interface ChatConfig {
    mode: ChatConfigMode
    thinking: boolean
    model: ChatModel
}