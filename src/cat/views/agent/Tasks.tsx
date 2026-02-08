import { For, Show } from "solid-js"

interface Props {
    tasks: AgentTask[]
}
export default function (props: Props) {

    const loadingIcon = `${window.initConfig.baseUrl}/icons/loading${window.initConfig.isDark ? '-dark' : ''}.svg`;

    return <div class="tasks">
        <For each={props.tasks}>
            {
                task => <div class="task">
                    <div class="title">
                        {task.prompt}
                    </div>
                    <img class="icon" src={loadingIcon} alt="loading" />
                </div>
            }
        </For>
        <Show when={props.tasks.length === 0}>
            <div class="empty">
                {I18nUtils.t('agent.task.empty')}
            </div>
        </Show>
    </div>
}