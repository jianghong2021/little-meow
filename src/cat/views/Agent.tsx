import { createSignal, Match, onCleanup, onMount, Switch } from "solid-js";
import { marked } from 'marked';
import { Console } from "./agent/Console";
import Config from "./agent/Config";
import { AgentMsgDbs } from "../../data/AgentMsgDb";
import Tasks from "./agent/Tasks";

const db = new AgentMsgDbs();
export default function () {
    const [message, setMessage] = createSignal<AgentMessage>({
        prompt: '',
        content: "",
        description: '',
        instruction: 'editDocument'
    });

    const workspace = window.initConfig.workspace;

    const [commPrompt, setCommPrompt] = createSignal('');
    const [waiting, setWaiting] = createSignal(false);
    const [tasks, setTasks] = createSignal<AgentTask[]>([]);

    const [panelMode, setPanelMode] = createSignal<AgentPanelMode>('config')

    const sendMessage = (prompt: string) => {
        if (waiting() || prompt.trim() == '') {
            return
        } else if (prompt.length <= 4) {
            agentConsole.warn(I18nUtils.t('agent.cmd.tips'));
            return
        }
        agentConsole.warn(I18nUtils.t('agent.input_waiting'));
        setWaiting(true);
        vscode.postMessage({
            type: 'sendMessage',
            data: {
                commPrompt: commPrompt(),
                prompt
            }
        });

        vscode.postMessage({ type: 'getStatus', data: undefined });

        setTimeout(() => {
            setWaiting(false);
        }, 1000 * 3);
    }

    const getPlacholder = () => {
        if (waiting()) {
            return I18nUtils.t('ai.chat.waiting')
        }
        return I18nUtils.t('agent.input_placeholder')
    }

    const cancelMessage = () => {
        if (message().content.trim() == '' || message().error) {
            agentConsole.log(I18nUtils.t('agent.cmd.none_tips'))
            return
        }
        setMessage({
            prompt: '',
            content: '',
            description: '',
            instruction: 'editDocument'
        })
    }

    const confirmMessage = () => {
        if (message().content.trim() == '' || message().error) {
            agentConsole.log(I18nUtils.t('agent.cmd.none_tips'))
            return
        }
        vscode.postMessage({ type: 'confirmMessage', data: message() });
        setMessage({
            ...message(),
            content: '',
        })
    }

    const onServerPutMessage = async (msg?: AgentMessage) => {
        if (!msg) {
            return
        }
        setMessage({
            prompt: msg.prompt,
            content: msg.content,
            description: await marked.parse(msg.description),
            instruction: msg.instruction,
            error: msg.error
        });
        if (msg.error) {
            agentConsole.error(msg.error);
        } else {
            agentConsole.info(msg.description);
        }
        setPanelMode('tasks');
    }

    const onStatus = (e: AgentStatus) => {
        setTasks(e.tasks);
        setWaiting(false);
    }

    const taskMode = ()=>{
        if(panelMode()=='config'){
            setPanelMode('tasks');
        }else{
            setPanelMode('config');
        }
        
    }

    const clearHistory = () => {
        db.removeAll(workspace);
        agentConsole.clear();
    }

    const clearAgent = () => {
        db.clear();
        agentConsole.clear();
        setCommPrompt('');
    }

    const inserMessage = (msg: ConsoleMessage) => {
        db.insert(msg);
    }

    const onmessage = (e: MessageEvent) => {
        const { type, data } = e.data;
        switch (type) {
            case 'onPutMessage':
                onServerPutMessage(data);
                break
            case 'onStatus':
                onStatus(data);
                break
            case 'taskMode':
                taskMode()
                break
            case 'clearAgent':
                clearAgent()
                break
            case 'clearHistory':
                clearHistory();
        }
    }

    const onExecute = (command: string) => {
        switch (command) {
            case 'y':
                confirmMessage();
                break
            case 'c':
                cancelMessage();
                break
            default:
                sendMessage(command);
        }
    }

    const onConsoleInit = () => {
        agentConsole.log(I18nUtils.t('ai.chat.input_placeholder'), undefined, false);
    }

    const updateCommPrompt = (data: AgentCommPrompt) => {
        setCommPrompt(data.prompt.trim());
        db.setCommPrompt(data);
    }

    const init = async () => {
        const prompt = await db.getCommPrompt(workspace);
        setCommPrompt(prompt?.prompt || '');

        const ar = await db.getAll(workspace);
        agentConsole.loadHistory(ar);
    }

    onMount(() => {
        setWaiting(true);
        db.init().then(() => {
            init()
        })
        window.addEventListener('message', onmessage);
        vscode.postMessage({ type: 'getStatus', data: undefined });
    })

    onCleanup(() => {
        window.removeEventListener('message', onmessage);
    })

    return <div class="panel-container">
        <Console disabled={waiting} onExecute={onExecute} onInit={onConsoleInit} onInsert={inserMessage} placeholder={getPlacholder()} />
        <Switch>
            <Match when={panelMode() == 'config'}>
                <Config answering={waiting} prompt={commPrompt} updateCommPrompt={updateCommPrompt} />
            </Match>
            <Match when={panelMode() == 'tasks'}>
                <Tasks tasks={tasks()} />
            </Match>
        </Switch>
    </div>
}