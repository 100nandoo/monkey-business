// ==UserScript==
// @name         YouTube Channel Videos - Stop Pagination Load
// @namespace    https://violentmonkey.github.io/
// @version      2026-05-09
// @description  Stop infinite pagination loading on YouTube channel video pages
// @author       100nandoo
// @homepageURL  https://github.com/100nandoo/monkey-business
// @supportURL   https://github.com/100nandoo/monkey-business/issues
// @icon         https://www.youtube.com/favicon.ico
// @downloadURL  https://raw.githubusercontent.com/100nandoo/monkey-business/main/yt-stop-pagination.user.js
// @match        https://www.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'vm-stop-pagination-style';
    const CONTINUATION_SELECTORS = [
        'ytd-continuation-item-renderer',
        '#contents ytd-continuation-item-renderer',
        'ytd-rich-grid-renderer #continuations',
        'ytd-rich-grid-renderer #spinner',
    ].join(', ');

    let lastUrl = location.href;

    function isChannelVideosPage() {
        return location.hostname === 'www.youtube.com' && /\/videos\/?$/.test(location.pathname);
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            ${CONTINUATION_SELECTORS} {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
                min-height: 0 !important;
                height: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    function isContinuationTarget(target) {
        return target instanceof Element && Boolean(target.closest('ytd-continuation-item-renderer, #continuations, #spinner'));
    }

    function patchIntersectionObserver() {
        const OriginalIntersectionObserver = window.IntersectionObserver;
        if (!OriginalIntersectionObserver || OriginalIntersectionObserver.__vmStopPaginationPatched) return;

        class PatchedIntersectionObserver extends OriginalIntersectionObserver {
            observe(target) {
                if (isChannelVideosPage() && isContinuationTarget(target)) {
                    return;
                }
                return super.observe(target);
            }
        }

        Object.defineProperty(PatchedIntersectionObserver, '__vmStopPaginationPatched', {
            value: true,
            configurable: false,
            enumerable: false,
            writable: false,
        });

        window.IntersectionObserver = PatchedIntersectionObserver;
    }

    function removeContinuationNodes(root = document) {
        if (!isChannelVideosPage()) return;

        const nodes = root.querySelectorAll?.(CONTINUATION_SELECTORS) || [];
        for (const node of nodes) {
            if (node instanceof HTMLElement) {
                node.remove();
            }
        }
    }

    function refreshPageState() {
        if (!isChannelVideosPage()) return;
        injectStyles();
        removeContinuationNodes();
    }

    const observer = new MutationObserver((mutations) => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
        }

        if (!isChannelVideosPage()) return;

        removeContinuationNodes();

        for (const mutation of mutations) {
            for (const addedNode of mutation.addedNodes) {
                if (addedNode instanceof HTMLElement) {
                    removeContinuationNodes(addedNode);
                }
            }
        }
    });

    patchIntersectionObserver();

    window.addEventListener('yt-navigate-finish', refreshPageState);
    window.addEventListener('load', refreshPageState);

    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
