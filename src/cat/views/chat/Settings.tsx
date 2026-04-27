import { createEffect, createSignal, For, onMount, Show } from "solid-js";

export default function (props: {
    onBack: () => void,
}) {
    const [platforms] = createSignal<ModePlatform[]>(window.initConfig.platforms);
    const [selectedPlatform, setSelectedPlatform] = createSignal<ModePlatform>(platforms()[0]);
    const [token, setToken] = createSignal("");
    const [baseUrl, setBaseUrl] = createSignal("");
    const initBaseUrls: Record<string, string> = window.initConfig.baseUrls || {};

    onMount(() => {
        window.addEventListener('message', onMessage);
        requestToken(selectedPlatform());
        setBaseUrl(initBaseUrls[selectedPlatform()] || '');
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

    const saveBaseUrl = () => {
        vscode.postMessage({
            type: 'setBaseUrl',
            data: { platform: selectedPlatform(), url: baseUrl() }
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
        setBaseUrl(initBaseUrls[selectedPlatform()] || '');
    });

    return (
        <div class="settings-container">

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
                                    {I18nUtils.t('chat.settings.'+platform)}
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
                    <Show when={selectedPlatform() === 'openai'}>
                        <div class="token-input-group" style={{ "margin-top": "8px" }}>
                            <input
                                type="text"
                                value={baseUrl()}
                                onInput={(e) => setBaseUrl(e.currentTarget.value)}
                                placeholder={I18nUtils.t('chat.settings.base_url_placeholder', 'Enter Base URL, e.g. https://api.openai.com/v1')}
                            />
                            <button class="save-button" onClick={saveBaseUrl}>
                                {I18nUtils.t('chat.settings.save', 'Save')}
                            </button>
                        </div>
                    </Show>
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
