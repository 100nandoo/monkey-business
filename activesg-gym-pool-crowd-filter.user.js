// ==UserScript==
// @name         ActiveSG Gym/Pool Crowd Filter
// @namespace    https://violentmonkey.github.io/
// @version      2026-05-09
// @description  Autofill the selected gym or pool name into the ActiveSG crowd page search box
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
    let refreshTimer = 0;
    const userOverrideByTab = {
        gym: false,
        pool: false,
    };

    function normalizeText(value) {
        return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
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

    function setNativeValue(input, value) {
        const prototype = Object.getPrototypeOf(input);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        descriptor?.set?.call(input, value);
    }

    function markUserOverride() {
        const activeTab = getActiveTabName();
        userOverrideByTab[activeTab] = true;
    }

    function applySearchValue() {
        const activeTab = getActiveTabName();
        const desiredValue = typeof VISIBLE_VENUES?.[activeTab] === 'string' ? VISIBLE_VENUES[activeTab].trim() : '';
        if (!desiredValue) return;
        if (userOverrideByTab[activeTab]) return;

        const input = getSearchInput();
        if (!(input instanceof HTMLInputElement)) return;
        if (input.value === desiredValue) return;

        input.focus();
        setNativeValue(input, desiredValue);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: desiredValue, inputType: 'insertText' }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function scheduleApply() {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(applySearchValue, 150);
    }

    const observer = new MutationObserver(() => {
        scheduleApply();
    });

    window.addEventListener('load', scheduleApply);
    document.addEventListener('click', scheduleApply, true);
    document.addEventListener('input', (event) => {
        if (!event.isTrusted) return;
        const input = getSearchInput();
        if (event.target === input) {
            markUserOverride();
        }
    }, true);
    document.addEventListener('change', (event) => {
        if (!event.isTrusted) return;
        const input = getSearchInput();
        if (event.target === input) {
            markUserOverride();
        }
    }, true);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    scheduleApply();
})();
