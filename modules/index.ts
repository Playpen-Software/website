import * as settings from './settings';
import * as tabs from './tabs';
import * as spaceFillers from './spaceFillers';
import { initTooltips } from './tooltips';
import * as playpenLib from './playpen';

import { populateSVGs } from "./fileLoader";

import '../sheets/index.css';
import '../sheets/notifications.css';
import '../sheets/playpen.css';
import '../sheets/spaceFillers.css';
import '../sheets/tabs.css';
import '../sheets/tooltips.css';

let isFinishing = false;
let initialization: Promise<void> | null = null;

export function init(): Promise<void> {
    if (!initialization) {
        initialization = initialize().catch(error => {
            initialization = null;
            throw error;
        });
    }
    return initialization;
}

async function initialize() {
    console.log("Initializing Website");
    initTooltips();

    // Load User Preferences
    try {
        await settings.init();
    } catch {}

    // Replace SVG Placeholders with SVGs
    try {
        await populateSVGs();
    } catch {
        try {
            await populateSVGs();
        } catch {}
    }

    // Attempt to bind tab-navigation fix.
    try {
        document.addEventListener('keydown', (event: KeyboardEvent): void => {
            if (event.key !== 'Tab') return;

            const selector = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
            const focusables = Array.from(
                document.querySelectorAll<HTMLElement>(selector)
            ).filter((el: HTMLElement) => {
                const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
                const isNotDisabled = !el.hasAttribute('disabled');
                return isVisible && isNotDisabled;
            });

            if (focusables.length === 0) return;

            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];
            const activeElement = document.activeElement as HTMLElement | null;

            if (lastEl && event.shiftKey && activeElement === firstEl) {
                lastEl.focus();
                event.preventDefault();
            } else if (firstEl && !event.shiftKey && activeElement === lastEl) {
                firstEl.focus();
                event.preventDefault();
            }
        });
    } catch {}

    // Initialize space filler shapes
    try {
        spaceFillers.init();
    } catch {}

    setTimeout(finishLoading, 250);
}

async function finishLoading() {
    if (isFinishing) return;
    isFinishing = true;

    if (!tabs.navigateFromURLParams()) tabs.goto('main_home', { logPrevious: false, removePrevious: true });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Website has finished loading DOM content");
    await playpenLib.waitForLoad();
    init();
});