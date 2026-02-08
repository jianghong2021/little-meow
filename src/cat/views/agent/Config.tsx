import { Accessor, createSignal, For, Setter } from 'solid-js';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    prompt: Accessor<string>
    updateCommPrompt: (data: AgentCommPrompt) => void
    answering: Accessor<boolean>
}

export default function (props: Props) {

    const { prompt } = props;
    const platforms = window.initConfig.platforms;
    const models = window.initConfig.models;
    const [config] = createSignal(window.initConfig.config);
    const workspace = window.initConfig.workspace;

    const setPlatform = (val: string) => {
        if (props.answering()) {
            return
        }
        vscode.postMessage({ type: 'setPlatform', data: val });
    }

    const getModels = () => {
        return models.filter(x => x.platform === config().codeModel.platform)
    }

    const setModel = (val: string) => {
        if (props.answering()) {
            return
        }
        vscode.postMessage({ type: 'setModel', data: val });
    }

    const updateCommPrompt = (prompt: string)=>{
        const data: AgentCommPrompt = {
            id: uuidv4(),
            workspace: workspace,
            prompt: prompt.trim()
        }

        props.updateCommPrompt(data);
    }

    return (
        <div class="agent-config">
            <textarea
                class="agent-config-input"
                placeholder={I18nUtils.t('agent.code.comm_prompt_placholder')}
                value={prompt()}
                onInput={(e) => updateCommPrompt(e.currentTarget.value)}
            />
            <div class="model-box">
                <select class="model-select" onchange={(e) => setPlatform(e.target.value)}>
                    <For each={platforms}>
                        {
                            x => <option value={x} selected={x === config().codeModel.platform}>
                                {x}
                            </option>
                        }
                    </For>
                </select>
                <select class="model-select" onchange={(e) => setModel(e.target.value)}>
                    <For each={getModels()}>
                        {
                            m => <option value={m.name} selected={m.name === config().codeModel.name}>
                                {m.label}
                            </option>
                        }
                    </For>
                </select>
            </div>
        </div>
    );
};