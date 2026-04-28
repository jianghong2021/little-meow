import { createSignal, For, onMount, Show } from "solid-js";

export default function (props: {
    onBack: () => void,
}) {
    const [models, setModels] = createSignal<ChatModel[]>(window.initConfig.models || []);
    const platforms = window.initConfig.platforms as ModePlatform[];
    const customProviders: CustomProvider[] = window.initConfig.customProviders || [];
    const abilities: ModeAbility[] = ['text', 'image', 'video'];

    const [showAdd, setShowAdd] = createSignal(false);
    const [newPlatform, setNewPlatform] = createSignal<ModePlatform>(platforms[0]);
    const [newName, setNewName] = createSignal("");
    const [newLabel, setNewLabel] = createSignal("");
    const [newAbility, setNewAbility] = createSignal<ModeAbility>("text");

    const [confirmDelete, setConfirmDelete] = createSignal<{ index: number, label: string } | null>(null);

    const getPlatformDisplay = (platform: ModePlatform) => {
        const provider = customProviders.find(p => p.id === platform);
        return provider ? provider.name : platform;
    };

    const saveToServer = (newModels: ChatModel[]) => {
        setModels(newModels);
        vscode.postMessage({ type: 'saveModels', data: newModels });
    };

    const addModel = () => {
        if (!newName().trim() || !newLabel().trim()) return;
        const model: ChatModel = {
            platform: newPlatform(),
            name: newName().trim(),
            label: newLabel().trim(),
            ability: newAbility()
        };
        saveToServer([...models(), model]);
        setShowAdd(false);
        setNewName("");
        setNewLabel("");
    };

    const deleteModel = (index: number, label: string) => {
        setConfirmDelete({
            index,
            label,
        })
    }

    const handleDelete = () => {
        const target = confirmDelete();
        if (target) {
            const newModels = [...models()];
            newModels.splice(target.index, 1);
            saveToServer(newModels);
            setConfirmDelete(null);
        }
    };

    return (
        <div class="settings-container">
            <Show when={confirmDelete()}>
                <div class="modal-overlay">
                    <div class="modal-content">
                        <h4>{I18nUtils.t('chat.models.delete_title', 'Confirm Delete')}</h4>
                        <p>{I18nUtils.t('chat.models.delete_confirm', `Are you sure you want to delete the model "${confirmDelete()?.label}"?`)}</p>
                        <div class="modal-actions">
                            <button class="modal-btn secondary" onClick={() => setConfirmDelete(null)}>
                                {I18nUtils.t('chat.models.cancel', 'Cancel')}
                            </button>
                            <button class="modal-btn danger" onClick={handleDelete}>
                                {I18nUtils.t('chat.tabs.delete', 'Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            </Show>

            <div class="settings-content">
                <div class="settings-section">
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                        <h3>{I18nUtils.t('chat.models.list', 'Model List')}</h3>
                        <button class="save-button" style={{ padding: '4px 8px' }} onClick={() => setShowAdd(!showAdd())}>
                            {showAdd() ? I18nUtils.t('chat.models.cancel', 'Cancel') : I18nUtils.t('chat.models.add', 'Add Model')}
                        </button>
                    </div>

                    <Show when={showAdd()}>
                        <div class="add-model-form">
                            <div class="token-input-group">
                                <label style={{ "font-size": "12px", "opacity": "0.8" }}>
                                    {I18nUtils.t('chat.models.platform', 'Platform')}</label>
                                <select class="model-form-select" value={newPlatform()} onInput={(e) => setNewPlatform(e.currentTarget.value as ModePlatform)}>
                                    <For each={platforms}>{(p) => <option value={p}>{getPlatformDisplay(p)}</option>}</For>
                                </select>
                            </div>
                            <div class="token-input-group">
                                <label style={{ "font-size": "12px", "opacity": "0.8" }}>
                                    {I18nUtils.t('chat.models.name', 'Name')}
                                </label>
                                <input type="text" placeholder="e.g. deepseek-v4" value={newName()} onInput={(e) => setNewName(e.currentTarget.value)} />
                            </div>
                            <div class="token-input-group">
                                <label style={{ "font-size": "12px", "opacity": "0.8" }}>
                                    {I18nUtils.t('chat.models.label', 'Label')}
                                </label>
                                <input type="text" placeholder="e.g. v4-pro" value={newLabel()} onInput={(e) => setNewLabel(e.currentTarget.value)} />
                            </div>
                            <div class="token-input-group">
                                <label style={{ "font-size": "12px", "opacity": "0.8" }}>
                                    {I18nUtils.t('chat.models.ability', 'Ability')}
                                </label>
                                <select class="model-form-select" value={newAbility()} onInput={(e) => setNewAbility(e.currentTarget.value as ModeAbility)}>
                                    <For each={abilities}>{(a) => <option value={a}>{a}</option>}</For>
                                </select>
                            </div>
                            <button class="save-button" onClick={addModel} style={{ "margin-top": "8px" }}>
                                {I18nUtils.t('chat.models.save', 'Save Model')}
                            </button>
                        </div>
                    </Show>

                    <Show when={!showAdd()}>
                        <div class="models-list">
                            <For each={models()}>
                                {(model, index) => (
                                    <div class="model-item">
                                        <div class="model-info">
                                            <div class="model-name">{model.name}</div>
                                            <div class="model-meta">
                                                <span class="model-tag">{getPlatformDisplay(model.platform)}</span>
                                                <span class="model-tag">{model.ability}</span>
                                                <span class="model-tag">{model.label}</span>
                                            </div>
                                        </div>
                                        <button class="danger-button icon-btn" onClick={() => deleteModel(index(), model.label)}>
                                            {I18nUtils.t('chat.tabs.delete', 'Delete')}
                                        </button>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>

                </div>
            </div>
        </div>
    );
}
