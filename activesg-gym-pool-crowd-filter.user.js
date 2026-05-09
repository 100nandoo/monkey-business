// ==UserScript==
// @name         ActiveSG Gym/Pool Crowd Filter
// @namespace    https://violentmonkey.github.io/
// @version      2026-05-09
// @description  Add controls to apply the selected gym or pool preset into the ActiveSG crowd page search box
// @author       100nandoo
// @homepageURL  https://github.com/100nandoo/monkey-business
// @supportURL   https://github.com/100nandoo/monkey-business/issues
// @icon         https://raw.githubusercontent.com/100nandoo/monkey-business/main/assets/monkey_business.png
// @downloadURL  https://raw.githubusercontent.com/100nandoo/monkey-business/main/activesg-gym-pool-crowd-filter.user.js
// @match        https://activesg.gov.sg/gym-pool-crowd*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

const VISIBLE_VENUES = {
    gym: 'Delta ActiveSG Gym',
    pool: '',
};

(function () {
    'use strict';

    const TAB_LABELS = ['gym', 'pool'];
    const STYLE_ID = 'vm-activesg-filter-style';
    const CONTROLS_ID = 'vm-activesg-filter-controls';
    const AUTO_TOGGLE_KEY = 'vm-activesg-filter-auto-apply';
    let refreshTimer = 0;

    function normalizeText(value) {
        return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function isAutoApplyEnabled() {
        return window.localStorage.getItem(AUTO_TOGGLE_KEY) === 'true';
    }

    function setAutoApplyEnabled(enabled) {
        window.localStorage.setItem(AUTO_TOGGLE_KEY, enabled ? 'true' : 'false');
    }

    function getActiveTabName() {
        const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));

        for (const tab of tabs) {
            if (!(tab instanceof HTMLElement)) continue;

            const label = normalizeText(tab.textContent);
            if (!TAB_LABELS.includes(label)) continue;

            const isSelected =
                tab.getAttribute('aria-selected') === 'true' ||
                tab.getAttribute('data-state') === 'active' ||
                tab.tabIndex === 0;

            if (isSelected) return label;
        }

        return 'gym';
    }

    function getSearchInput() {
        return Array.from(document.querySelectorAll('input')).find((input) => {
            const placeholder = normalizeText(input.getAttribute('placeholder'));
            return placeholder.includes('search for a gym') || placeholder.includes('search for a pool');
        }) || null;
    }

    function getControlsMount() {
        const input = getSearchInput();
        if (!(input instanceof HTMLElement)) return null;

        return input.parentElement;
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${CONTROLS_ID} {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0 0 12px;
                flex-wrap: wrap;
            }

            #${CONTROLS_ID} button,
            #${CONTROLS_ID} label {
                font: 500 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            #${CONTROLS_ID} button {
                border: 1px solid rgba(0, 0, 0, 0.14);
                border-radius: 999px;
                background: #fff;
                color: #111827;
                padding: 8px 12px;
                cursor: pointer;
            }

            #${CONTROLS_ID} button:hover {
                background: #f3f4f6;
            }

            #${CONTROLS_ID} label {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                color: #374151;
            }

            #${CONTROLS_ID} input[type="checkbox"] {
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function setNativeValue(input, value) {
        const prototype = Object.getPrototypeOf(input);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        descriptor?.set?.call(input, value);
    }

    function applySearchValue() {
        const activeTab = getActiveTabName();
        const desiredValue = typeof VISIBLE_VENUES?.[activeTab] === 'string' ? VISIBLE_VENUES[activeTab].trim() : '';
        if (!desiredValue) return;

        const input = getSearchInput();
        if (!(input instanceof HTMLInputElement)) return;
        if (input.value === desiredValue) return;

        input.focus();
        setNativeValue(input, desiredValue);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: desiredValue, inputType: 'insertText' }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function updateControlsState() {
        const autoToggle = document.getElementById('vm-activesg-auto-toggle');
        if (autoToggle instanceof HTMLInputElement) {
            autoToggle.checked = isAutoApplyEnabled();
        }
    }

    function ensureControls() {
        injectStyles();

        const mount = getControlsMount();
        if (!(mount instanceof HTMLElement)) return;

        let controls = document.getElementById(CONTROLS_ID);
        if (!(controls instanceof HTMLElement)) {
            controls = document.createElement('div');
            controls.id = CONTROLS_ID;
            controls.innerHTML = `
                <button type="button" id="vm-activesg-apply-button">Apply Preset</button>
                <label for="vm-activesg-auto-toggle">
                    <input type="checkbox" id="vm-activesg-auto-toggle">
                    Auto Fill
                </label>
            `;
        }

        if (controls.parentElement !== mount) {
            mount.parentElement?.insertBefore(controls, mount);
        }

        const applyButton = document.getElementById('vm-activesg-apply-button');
        if (applyButton && !applyButton.dataset.vmBound) {
            applyButton.addEventListener('click', () => {
                applySearchValue();
            });
            applyButton.dataset.vmBound = 'true';
        }

        const autoToggle = document.getElementById('vm-activesg-auto-toggle');
        if (autoToggle instanceof HTMLInputElement && !autoToggle.dataset.vmBound) {
            autoToggle.addEventListener('change', () => {
                setAutoApplyEnabled(autoToggle.checked);
                if (autoToggle.checked) {
                    applySearchValue();
                }
            });
            autoToggle.dataset.vmBound = 'true';
        }

        updateControlsState();
    }

    function refreshUi() {
        ensureControls();

        if (isAutoApplyEnabled()) {
            applySearchValue();
        }
    }

    function scheduleRefresh() {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(refreshUi, 150);
    }

    const observer = new MutationObserver(() => {
        scheduleRefresh();
    });

    window.addEventListener('load', scheduleRefresh);
    document.addEventListener('click', scheduleRefresh, true);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    scheduleRefresh();
})();
