import { init as initPlaypenLib } from './playpen';
import { showPopup } from './notifications';

type PreferenceValues = {
    spaceFillersEnabled: boolean;
    useSpaceFillerBlur: boolean;
    transitionAnimations: boolean;
    spaceFillerAnimations: boolean;
    [key: string]: unknown;
};

const defaultPreferences: PreferenceValues = {
    spaceFillersEnabled: true,
    useSpaceFillerBlur: true,
    transitionAnimations: true,
    spaceFillerAnimations: true
};

let currentPreferences: PreferenceValues = { ...defaultPreferences };
export let preferences: Readonly<PreferenceValues> = Object.freeze({ ...currentPreferences });
let settingsInputsInitialized = false;
let tabInitialized = false;

function getEBD<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Settings element "${id}" was not found.`);
    return element as T;
}

export async function init() {
    try {
        const savedJson = localStorage.getItem('preferences');
        if (savedJson) {
            const saved = JSON.parse(savedJson);
            if (saved && Object.keys(saved).length) {
                currentPreferences = { ...currentPreferences, ...saved };
                preferences = Object.freeze({ ...currentPreferences });
            }
        }
    } catch (e) {
        console.error('Failed to load preferences from localStorage:', e);
    }

    initSettingsInputs();
    initPlaypenLib();
    initTab();
}

function initSettingsInputs() {
    if (settingsInputsInitialized) return;
    document.querySelectorAll<HTMLInputElement>('input[data-preferences-key]').forEach(input => {
        const key = input.dataset['preferencesKey']!;
        syncPreferenceInput(input, key);
        input.addEventListener('change', () => {
            let value: unknown = input.type === 'checkbox' ? input.checked :
                input.type === 'number' ? input.valueAsNumber : input.value;
            if (typeof value === 'number' && Number.isNaN(value)) value = currentPreferences[key as keyof PreferenceValues];
            void setPreferences({ [key]: value } as Partial<PreferenceValues>).catch(error => {
                console.error(`Failed to save preference ${key}:`, error);
            });
        });
    });
    settingsInputsInitialized = true;
}

function syncPreferenceInput(input: HTMLInputElement, key: string) {
    const value = currentPreferences[key];
    if (input.type === 'checkbox') input.checked = Boolean(value);
    else if (input.type === 'number') input.valueAsNumber = Number(value);
    else input.value = String(value);
}

async function setPreferences(updates: Partial<PreferenceValues>) {
    for (const [key, value] of Object.entries(updates)) {
        if (!(key in currentPreferences)) throw new Error(`Unknown preference: ${key}`);
        if (value !== undefined && typeof value !== typeof currentPreferences[key as keyof PreferenceValues]) {
            throw new Error(`Preference "${key}" must be a ${typeof currentPreferences[key as keyof PreferenceValues]}.`);
        }
    }

    currentPreferences = { ...currentPreferences, ...updates };
    preferences = Object.freeze({ ...currentPreferences });

    // Save the entire updated preferences object to localStorage
    try {
        localStorage.setItem('preferences', JSON.stringify(currentPreferences));
    } catch (error) {
        throw new Error('Failed to save preferences to localStorage.');
    }

    Object.keys(updates).forEach(notifyPreferencesUpdate);
}

function notifyPreferencesUpdate(preference: string) {
    window.dispatchEvent(new CustomEvent('preferencesUpdate', { detail: { preference } }));
}

async function confirmReset(title: string, message: string) {
    return await showPopup<boolean>(title, message, 'options', [
        { content: 'Cancel', value: false, highlighted: true },
        { content: 'Reset', value: true }
    ]) === true;
}

async function resetPreferences() {
    const snapshot = { ...defaultPreferences, themeVariables: {} };
    
    try {
        localStorage.setItem('preferences', JSON.stringify(snapshot));
        currentPreferences = snapshot;
        preferences = Object.freeze({ ...currentPreferences });
        Object.keys(defaultPreferences).forEach(notifyPreferencesUpdate);
        document.querySelectorAll<HTMLInputElement>('input[data-preferences-key]').forEach(input => {
            syncPreferenceInput(input, input.dataset['preferencesKey']!);
        });
    } catch (error) {
        throw new Error('Failed to reset preferences.');
    }
    
    initPlaypenLib();
}

function initTab() {
    if (tabInitialized) return;
    getEBD<HTMLButtonElement>('settings-reset').addEventListener('click', async () => {
        if(await showPopup(
            'Reset Website Preferences',
            'Are you sure you want to reset your preferences for this website?',
            'options',
            [
                { content: 'Reset', value: true },
                { content: 'Cancel', value: false, highlighted: true }
            ]
        )) resetPreferences();
    });
    tabInitialized = true;
}