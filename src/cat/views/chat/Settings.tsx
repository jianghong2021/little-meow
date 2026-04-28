import { createEffect, createSignal, For, onMount, Show } from "solid-js";

export default function (props: {
    onBack: () => void,
}) {
    const [platforms] = createSignal<ModePlatform[]>(window.initConfig.platforms);
    const [selectedPlatform, setSelectedPlatform] = createSignal<ModePlatform>(platforms()[0]);
    const [token, setToken] = createSignal("");
    const customProvidersData: CustomProvider[] = window.initConfig.customProviders || [];

    const [customProviders, setCustomProviders] = createSignal<CustomProvider[]>(customProvidersData);
    const [showAddProvider, setShowAddProvider] = createSignal(false);
    const [newProviderId, setNewProviderId] = createSignal("");
    const [newProviderName, setNewProviderName] = createSignal("");
    const [newProviderUrl, setNewProviderUrl] = createSignal("");
    const [confirmDeleteProv, setConfirmDeleteProv] = createSignal<string | null>(null);

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

    const addProvider = () => {
        const id = newProviderId().trim();
        const name = newProviderName().trim();
        const url = newProviderUrl().trim();
        if (!id || !name || !url) return;
        const provider: CustomProvider = { id, name, baseUrl: url };
        setCustomProviders(prev => [...prev, provider]);
        vscode.postMessage({ type: 'addCustomProvider', data: provider });
        setShowAddProvider(false);
        setNewProviderId("");
        setNewProviderName("");
        setNewProviderUrl("");
    };

    const deleteProvider = (id: string) => {
        setCustomProviders(prev => prev.filter(p => p.id !== id));
        vscode.postMessage({ type: 'deleteCustomProvider', data: id });
        setConfirmDeleteProv(null);
        if (selectedPlatform() === id) {
            setSelectedPlatform(platforms()[0] || 'deepseek');
        }
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
                                    {customProviders().find(p => p.id === platform)?.name || I18nUtils.t('chat.settings.' + platform, platform)}
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
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                        <h3>{I18nUtils.t('chat.settings.third_party_providers', 'Third-Party Providers')}</h3>
                        <button class="save-button" style={{ padding: '4px 8px' }} onClick={() => setShowAddProvider(!showAddProvider())}>
                            {showAddProvider() ? I18nUtils.t('chat.settings.cancel', 'Cancel') : I18nUtils.t('chat.settings.add_provider', 'Add Provider')}
                        </button>
                    </div>

                    <Show when={showAddProvider()}>
                        <div class="add-model-form">
                            <div class="token-input-group">
                                <label style={{ "font-size": "12px", "opacity": "0.8" }}>
                                    {I18nUtils.t('chat.settings.provider_id', 'Provider ID')}
                                </label>
                                <input type="text" placeholder="e.g. ollama" value={newProviderId()} onInput={(e) => setNewProviderId(e.currentTarget.value)} />
                            </div>
                            <div class="token-input-group">
                                <label style={{ "font-size": "12px", "opacity": "0.8" }}>
                                    {I18nUtils.t('chat.settings.provider_name', 'Display Name')}
                                </label>
                                <input type="text" placeholder="e.g. Ollama" value={newProviderName()} onInput={(e) => setNewProviderName(e.currentTarget.value)} />
                            </div>
                            <div class="token-input-group">
                                <label style={{ "font-size": "12px", "opacity": "0.8" }}>
                                    {I18nUtils.t('chat.settings.base_url', 'Base URL')}
                                </label>
                                <input type="text" placeholder="e.g. http://localhost:11434/v1" value={newProviderUrl()} onInput={(e) => setNewProviderUrl(e.currentTarget.value)} />
                            </div>
                            <button class="save-button" onClick={addProvider} style={{ "margin-top": "8px" }}>
                                {I18nUtils.t('chat.settings.save_provider', 'Save Provider')}
                            </button>
                        </div>
                    </Show>

                    <Show when={!showAddProvider()}>
                        <Show when={customProviders().length > 0}>
                            <div class="models-list">
                                <For each={customProviders()}>
                                    {(provider) => (
                                        <div class="model-item">
                                            <div class="model-info">
                                                <div class="model-name">{provider.name}</div>
                                                <div class="model-meta">
                                                    <span class="model-tag">{provider.id}</span>
                                                    <span class="model-tag">{provider.baseUrl}</span>
                                                </div>
                                            </div>
                                            <button class="danger-button icon-btn" onClick={() => setConfirmDeleteProv(provider.id)}>
                                                {I18nUtils.t('chat.tabs.delete', 'Delete')}
                                            </button>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                        <Show when={customProviders().length === 0}>
                            <p style={{ "font-size": "12px", "opacity": "0.5", "text-align": "center", "padding": "16px" }}>
                                {I18nUtils.t('chat.settings.no_providers', 'No third-party providers configured')}
                            </p>
                        </Show>
                    </Show>
                </div>

                <Show when={confirmDeleteProv()}>
                    <div class="modal-overlay">
                        <div class="modal-content">
                            <h4>{I18nUtils.t('chat.settings.delete_provider_title', 'Delete Provider')}</h4>
                            <p>{I18nUtils.t('chat.settings.delete_provider_confirm', 'Are you sure you want to delete this provider?')}</p>
                            <div class="modal-actions">
                                <button class="modal-btn secondary" onClick={() => setConfirmDeleteProv(null)}>
                                    {I18nUtils.t('chat.models.cancel', 'Cancel')}
                                </button>
                                <button class="modal-btn danger" onClick={() => deleteProvider(confirmDeleteProv()!)}>
                                    {I18nUtils.t('chat.tabs.delete', 'Delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                </Show>

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
