// ==UserScript==
// @name         YouTube Watch - Restore Hidden Controls
// @namespace    https://violentmonkey.github.io/
// @version      2026-05-09
// @description  Restore fullscreen quick actions on YouTube watch pages
// @author       100nandoo
// @homepageURL  https://github.com/100nandoo/monkey-business
// @supportURL   https://github.com/100nandoo/monkey-business/issues
// @icon         https://www.youtube.com/favicon.ico
// @downloadURL  https://raw.githubusercontent.com/100nandoo/monkey-business/main/yt-watch.user.js
// @match        https://www.youtube.com/watch*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const QUICK_ACTIONS_SELECTOR = '.ytp-fullscreen-quick-actions';

    function isWatchPage() {
        return location.hostname === 'www.youtube.com' && location.pathname === '/watch';
    }

    function revealHiddenControls(root = document) {
        if (!isWatchPage()) return;

        const nodes = root.querySelectorAll?.(QUICK_ACTIONS_SELECTOR) || [];
        for (const node of nodes) {
            if (node instanceof HTMLElement && node.style.display === 'none') {
                node.style.removeProperty('display');
            }
        }
    }

    const observer = new MutationObserver((mutations) => {
        revealHiddenControls();

        for (const mutation of mutations) {
            for (const addedNode of mutation.addedNodes) {
                if (addedNode instanceof HTMLElement) {
                    revealHiddenControls(addedNode);
                }
            }
        }
    });

    window.addEventListener('yt-navigate-finish', () => {
        revealHiddenControls();
    });

    window.addEventListener('load', () => {
        revealHiddenControls();
    });

    revealHiddenControls();
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
})();
