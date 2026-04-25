import { createEffect, createSignal, For, onMount } from "solid-js";

export default function (props: {
    onBack: () => void,
}) {
    const [platforms] = createSignal<ModePlatform[]>(window.initConfig.platforms);
    const [selectedPlatform, setSelectedPlatform] = createSignal<ModePlatform>(platforms()[0]);
    const [token, setToken] = createSignal("");
    const baseUrl = window.initConfig.baseUrl;

    onMount(() => {
        window.addEventListener('message', onMessage);
        requestToken(selectedPlatform());
    });

    const onMessage = (e: MessageEvent) => {
        const { type, data } = e.data;
        if (type === 'onToken' && data.platform === selectedPlatform()) {
            setToken(data.token || "");
        }
    };

    const requestToken = (platform: ModePlatform) => {
        vscode.postMessage({ type: 'getToken', data: platform });
    };

    const saveToken = () => {
        vscode.postMessage({
            type: 'setToken',
            data: { platform: selectedPlatform(), token: token() }
        });
    };

    const clearHistory = () => {
        vscode.postMessage({ type: 'command', data: 'my-cat.clear' });
    };

    const clearAllHistory = () => {
        vscode.postMessage({ type: 'command', data: 'my-cat.clearAll' });
    };

    createEffect(() => {
        requestToken(selectedPlatform());
    });

    return (
        <div class="settings-container">
            <div class="settings-header">
                <h2>{I18nUtils.t('chat.settings.title', 'Settings')}</h2>
            </div>

            <div class="settings-content">
                <div class="settings-section">
                    <h3>{I18nUtils.t('chat.settings.api_token', 'API Token')}</h3>
                    <div class="platform-selector">
                        <For each={platforms()}>
                            {(platform) => (
                                <div
                                    class={`platform-item ${selectedPlatform() === platform ? 'active' : ''}`}
                                    onClick={() => setSelectedPlatform(platform)}
                                >
                                    {platform}
                                </div>
                            )}
                        </For>
                    </div>
                    <div class="token-input-group">
                        <input
                            type="password"
                            value={token()}
                            onInput={(e) => setToken(e.currentTarget.value)}
                            placeholder={I18nUtils.t('chat.settings.token_placeholder', 'Enter API Token')}
                        />
                        <button class="save-button" onClick={saveToken}>
                            {I18nUtils.t('chat.settings.save', 'Save')}
                        </button>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>{I18nUtils.t('chat.settings.danger_zone', 'Danger Zone')}</h3>
                    <div class="danger-actions">
                        <button class="danger-button" onClick={clearHistory}>
                            {I18nUtils.t('chat.clear.current', 'Clear Current History')}
                        </button>
                        <button class="danger-button" onClick={clearAllHistory}>
                            {I18nUtils.t('chat.clear.all', 'Clear All History')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
