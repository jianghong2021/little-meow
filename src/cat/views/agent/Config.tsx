import { Accessor, createSignal, For, Setter } from 'solid-js';

interface Props {
    prompt: Accessor<string>
    setPrompt: (prompt: string) => void
    answering: Accessor<boolean>
}

export default function (props: Props) {

    const { prompt, setPrompt } = props;
    const platforms = window.initConfig.platforms;
    const models = window.initConfig.models;
    const [config, setConfig] = createSignal(window.initConfig.config);

    const setPlatform = (val: string) => {
        if (props.answering()) {
            return
        }
        vscode.postMessage({ type: 'setPlatform', data: val });
    }

    const getModels = () => {
        return models.filter(x => x.platform === config().chatModel.platform)
    }

    const setModel = (val: string) => {
        if (props.answering()) {
            return
        }
        vscode.postMessage({ type: 'setModel', data: val });
    }

    return (
        <div class="agent-config">
            <textarea
                class="agent-config-input"
                placeholder={I18nUtils.t('agent.code.comm_prompt_placholder')}
                value={prompt()}
                onInput={(e) => setPrompt(e.currentTarget.value)}
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