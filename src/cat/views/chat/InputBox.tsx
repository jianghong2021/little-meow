import { For, Accessor, createSignal, Setter, onMount, onCleanup } from "solid-js"
import { Pet } from "./Pet"

interface Props {
    answering: Accessor<boolean>
    activeDocument: {
        file: string
        show: boolean
    }
    emotion: Accessor<PetEmotion>
    setEmotion: Setter<PetEmotion>
    conversation: Accessor<ConversationDetails>
    config: Accessor<ChatConfig>
    setConfig: Setter<ChatConfig>
    sendMessage: (text: string) => void
}

export default function (props: Props) {

    const sendIcon = `${window.initConfig.baseUrl}/icons/send${window.initConfig.isDark ? '-dark' : ''}.svg`;

    const platforms = window.initConfig.platforms;
    const models = window.initConfig.models;

    const [inputText, setInputText] = createSignal('');

    const getThinkingIcon = () => {
        return `${window.initConfig.baseUrl}/icons/ic-${props.config().thinking ? 'thinking-1' : 'thinking-0'}.svg`;
    }

    const getModeIcon = () => {
        return `${window.initConfig.baseUrl}/icons/ic-${props.conversation().mode === 'norm' ? 'check' : 'checked'}.svg`;
    }

    const getModels = () => {
        return models.filter(x => x.platform === props.config().model.platform)
    }

    const setChatMode = () => {
        if (props.answering()) {
            return
        }
        vscode.postMessage({ type: 'setChatMode', data: undefined });
    }

    const setPlatform = (val: string) => {
        if (props.answering()) {
            return
        }
        vscode.postMessage({ type: 'setPlatform', data: val });
    }

    const setModel = (val: string) => {
        if (props.answering()) {
            return
        }
        props.setConfig(prev => {
            return {
                ...prev,
                model: {
                    ...prev.model,
                    name: val as any
                }
            }
        });
        vscode.postMessage({ type: 'setModel', data: val });
    }

    const setChatThinking = () => {
        if (props.answering()) {
            return
        }
        props.setConfig(prev => {
            return {
                ...prev,
                thinking: !prev.thinking
            }
        });
        vscode.postMessage({ type: 'setChatThinking', data: undefined });
    }

    const sendMessage = () => {
        props.sendMessage(inputText());
        setInputText('');
    }

    const onEnterPress = (e: KeyboardEvent) => {
        if (e.code.toLowerCase() !== 'enter') {
            return
        }
        e.preventDefault();
        sendMessage();
    }

    let emoTimer:any;

    const randomEmotion = ()=>{
        const time = Date.now() + '';
        const d = parseInt(time[time.length-1])||0;
        if(d % 2 === 0){
            return
        }
        const ar: PetEmotion[] = ['angry','happy','idle','sad','speaking','thinking'];
        const index = Math.floor(Math.random() * ar.length);

        const wAr: PetEmotion[] = ['happy','idle', 'speaking','thinking'];
        const wIndex = Math.floor(Math.random() * wAr.length);

        if(d > 4){
            props.setEmotion(wAr[wIndex]);
        }else{
            props.setEmotion(ar[index]);
        }
    }

    onMount(()=>{
        emoTimer = setInterval(randomEmotion,3000);
    })

    onCleanup(()=>{
        clearInterval(emoTimer);
    })

    return <div class="chat-input-container">
        <div id="activeDocument" data-mode={props.conversation().mode} style={{ display: props.activeDocument.show ? 'flex' : 'none' }}>
            <span>
                {props.activeDocument.file}
            </span>
            <img onclick={() => setChatMode()} src={getModeIcon()} />
        </div>
        <Pet emotion={props.emotion()} size={80}/>
        <textarea id="message-input" value={inputText()} placeholder={I18nUtils.t('ai.chat.input_placeholder')} autocomplete="off" rows={2} oninput={e => setInputText(e.target.value.trim())} onkeypress={e => onEnterPress(e)}>

        </textarea>

        <div class="bottom-btns">
            <div class="model-box">
                <select class="model-select" onchange={(e) => setPlatform(e.target.value)}>
                    <For each={platforms}>
                        {
                            x => <option value={x} selected={x === props.config().model.platform}>
                                {x}
                            </option>
                        }
                    </For>
                </select>
                <select class="model-select" onchange={(e) => setModel(e.target.value)}>
                    <For each={getModels()}>
                        {
                            m => <option value={m.name} selected={m.name === props.config().model.name}>
                                {m.label}
                            </option>
                        }
                    </For>
                </select>
                <div class="thinking" classList={{ 'thinking-ac': props.config().thinking }} onclick={() => setChatThinking()}>
                    <span>{I18nUtils.t('ai.chat.thinking')}</span>
                    <img src={getThinkingIcon()} />
                </div>
            </div>

            <button id="send-button" disabled={props.answering() || inputText() === ''} onclick={() => sendMessage()}>
                <img src={sendIcon} />
            </button>
        </div>
    </div>
}