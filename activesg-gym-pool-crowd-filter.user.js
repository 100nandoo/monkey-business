// ==UserScript==
// @name         ActiveSG Gym/Pool Crowd Filter
// @namespace    https://violentmonkey.github.io/
// @version      2026-08-09
// @description  Add controls to filter the ActiveSG crowd page down to the selected gym or pool venues
// @author       100nandoo
// @homepageURL  https://github.com/100nandoo/monkey-business
// @supportURL   https://github.com/100nandoo/monkey-business/issues
// @icon         https://activesg.gov.sg/favicon.ico
// @downloadURL  https://raw.githubusercontent.com/100nandoo/monkey-business/main/activesg-gym-pool-crowd-filter.user.js
// @match        https://activesg.gov.sg/gym-pool-crowd*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

const VISIBLE_VENUES = {
    gym: ['Delta ActiveSG Gym', 'Queenstown ActiveSG Gym'],
    pool: [],
};

(function () {
    'use strict';

    const TAB_LABELS = ['gym', 'pool'];
    const STYLE_ID = 'vm-activesg-filter-style';
    const CONTROLS_ID = 'vm-activesg-filter-controls';
    const FILTER_TOGGLE_KEY = 'vm-activesg-filter-enabled';
    let refreshTimer = 0;

    function normalizeText(value) {
        return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function isFilterEnabled() {
        return window.localStorage.getItem(FILTER_TOGGLE_KEY) === 'true';
    }

    function setFilterEnabled(enabled) {
        window.localStorage.setItem(FILTER_TOGGLE_KEY, enabled ? 'true' : 'false');
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

    function getDesiredVenueNames() {
        const activeTab = getActiveTabName();
        const configuredValue = VISIBLE_VENUES?.[activeTab];

        if (Array.isArray(configuredValue)) {
            return configuredValue.map(normalizeText).filter(Boolean);
        }

        if (typeof configuredValue === 'string') {
            return configuredValue
                .split(',')
                .map(normalizeText)
                .filter(Boolean);
        }

        return [];
    }

    function getVenueListContainer() {
        const input = getSearchInput();
        if (!(input instanceof HTMLElement)) return null;

        let container = input.parentElement;

        while (container && container !== document.body) {
            const matchingChildren = Array.from(container.children).filter((child) => {
                return normalizeText(child.textContent).includes('% full');
            });

            if (matchingChildren.length >= 2) {
                return container;
            }

            container = container.parentElement;
        }

        return null;
    }

    function getVenueCards() {
        const container = getVenueListContainer();
        if (!(container instanceof HTMLElement)) return [];

        return Array.from(container.children).filter((child) => {
            if (!(child instanceof HTMLElement)) return false;
            return normalizeText(child.textContent).includes('% full');
        });
    }

    function getVenueCardName(card) {
        const title = card.querySelector('p');
        return normalizeText(title?.textContent);
    }

    function applyVenueFilter() {
        const desiredVenueNames = getDesiredVenueNames();
        const cards = getVenueCards();

        if (!cards.length) return;

        for (const card of cards) {
            const venueName = getVenueCardName(card);
            const shouldShow =
                !desiredVenueNames.length ||
                desiredVenueNames.some((desiredVenueName) => {
                    return venueName === desiredVenueName || venueName.includes(desiredVenueName);
                });

            card.style.display = shouldShow ? '' : 'none';
        }
    }

    function resetVenueFilter() {
        const cards = getVenueCards();

        for (const card of cards) {
            card.style.display = '';
        }
    }

    function updateControlsState() {
        const filterToggle = document.getElementById('vm-activesg-filter-toggle');
        if (filterToggle instanceof HTMLInputElement) {
            filterToggle.checked = isFilterEnabled();
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
                <label for="vm-activesg-filter-toggle">
                    <input type="checkbox" id="vm-activesg-filter-toggle">
                    Apply Filter
                </label>
            `;
        }

        if (controls.parentElement !== mount) {
            mount.parentElement?.insertBefore(controls, mount);
        }

        const filterToggle = document.getElementById('vm-activesg-filter-toggle');
        if (filterToggle instanceof HTMLInputElement && !filterToggle.dataset.vmBound) {
            filterToggle.addEventListener('change', () => {
                setFilterEnabled(filterToggle.checked);
                if (filterToggle.checked) {
                    applyVenueFilter();
                } else {
                    resetVenueFilter();
                }
            });
            filterToggle.dataset.vmBound = 'true';
        }

        updateControlsState();
    }

    function refreshUi() {
        ensureControls();

        if (isFilterEnabled()) {
            applyVenueFilter();
            return;
        }

        resetVenueFilter();
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
