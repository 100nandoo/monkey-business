// ==UserScript==
// @name         YouTube Channel Videos - Most Viewed Button
// @namespace    https://violentmonkey.github.io/
// @version      2026-05-09
// @description  Add a "Most Viewed" button to YouTube channel video pages
// @author       100nandoo
// @homepageURL  https://github.com/100nandoo/monkey-business
// @supportURL   https://github.com/100nandoo/monkey-business/issues
// @icon         https://raw.githubusercontent.com/100nandoo/monkey-business/main/assets/monkey_business.png
// @downloadURL  https://raw.githubusercontent.com/100nandoo/monkey-business/main/yt-sort-by-views.user.js
// @match        https://www.youtube.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'vm-most-viewed-btn';
    const FALLBACK_CONTAINER_ID = 'vm-most-viewed-fallback';
    const STYLE_ID = 'vm-most-viewed-style';
    const PAGINATION_STYLE_ID = 'vm-stop-pagination-style';
    const CONTINUATION_SELECTORS = [
        'ytd-continuation-item-renderer',
        '#contents ytd-continuation-item-renderer',
        'ytd-rich-grid-renderer #continuations',
        'ytd-rich-grid-renderer #spinner',
    ].join(', ');

    let lastUrl = location.href;
    let refreshTimer = 0;
    let sortInProgress = false;
    let paginationStopped = false;

    function isChannelVideosPage() {
        return location.hostname === 'www.youtube.com' && /\/videos\/?$/.test(location.pathname);
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${BUTTON_ID} {
                box-sizing: border-box;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
                margin: 0 8px 0 0;
                padding: 0 12px;
                height: 32px;
                border: 0;
                border-radius: 8px;
                background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05));
                color: var(--yt-spec-text-primary, #0f0f0f);
                font: 500 14px/1 Roboto, Arial, sans-serif;
                cursor: pointer;
                white-space: nowrap;
            }

            #${BUTTON_ID}:hover {
                background: var(--yt-spec-mono-tonal-hover, rgba(0, 0, 0, 0.1));
            }

            #${BUTTON_ID}.is-active {
                background: var(--yt-spec-text-primary, #0f0f0f);
                color: var(--yt-spec-base-background, #fff);
            }

            #${FALLBACK_CONTAINER_ID} {
                display: flex;
                align-items: center;
                min-height: 32px;
                margin: 0 0 16px;
            }

            @media (prefers-color-scheme: dark) {
                #${BUTTON_ID} {
                    background: var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1));
                    color: var(--yt-spec-text-primary, #fff);
                }

                #${BUTTON_ID}:hover {
                    background: var(--yt-spec-mono-tonal-hover, rgba(255, 255, 255, 0.18));
                }
            }
        `;
        document.head.appendChild(style);
    }

    function parseViews(text) {
        const match = text?.match(/([\d.,]+)\s*([KMB])?\s+views?\b/i);
        if (!match) return 0;

        const [, rawNumber, rawSuffix = ''] = match;
        let value = Number.parseFloat(rawNumber.replace(/,/g, ''));
        if (Number.isNaN(value)) return 0;

        const suffix = rawSuffix.toUpperCase();
        if (suffix === 'B') value *= 1_000_000_000;
        else if (suffix === 'M') value *= 1_000_000;
        else if (suffix === 'K') value *= 1_000;

        return value;
    }

    function injectPaginationStyles() {
        if (document.getElementById(PAGINATION_STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = PAGINATION_STYLE_ID;
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
                if (isChannelVideosPage() && paginationStopped && isContinuationTarget(target)) {
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
        if (!isChannelVideosPage() || !paginationStopped) return;

        const nodes = root.querySelectorAll?.(CONTINUATION_SELECTORS) || [];
        for (const node of nodes) {
            if (node instanceof HTMLElement) {
                node.remove();
            }
        }
    }

    function stopPagination() {
        if (!isChannelVideosPage()) return;

        paginationStopped = true;
        injectPaginationStyles();
        patchIntersectionObserver();
        removeContinuationNodes();
    }

    function getGrid() {
        return document.querySelector('ytd-rich-grid-renderer #contents');
    }

    function getItems(grid = getGrid()) {
        if (!grid) return [];

        return Array.from(grid.querySelectorAll('ytd-rich-item-renderer')).filter((item) => {
            return Boolean(item.querySelector('yt-lockup-view-model, ytd-rich-grid-media'));
        });
    }

    function getViewCount(item) {
        const metadataNodes = item.querySelectorAll(
            [
                'yt-content-metadata-view-model span',
                '#metadata-line span',
                '.ytContentMetadataViewModelMetadataText',
            ].join(', ')
        );
        const viewText = Array.from(metadataNodes)
            .map((node) => (node.textContent || '').trim())
            .find((text) => /\bviews?\b/i.test(text));

        return parseViews(viewText);
    }

    function getItemsPerRow(grid) {
        const cssValue = getComputedStyle(grid).getPropertyValue('--ytd-rich-grid-items-per-row').trim();
        const parsedCssValue = Number.parseInt(cssValue, 10);
        if (Number.isFinite(parsedCssValue) && parsedCssValue > 0) return parsedCssValue;

        const attrValue = Number.parseInt(grid.getAttribute('elements-per-row') || '', 10);
        if (Number.isFinite(attrValue) && attrValue > 0) return attrValue;

        return 4;
    }

    function normalizeGridLayout(grid, sortedItems) {
        const itemsPerRow = getItemsPerRow(grid);

        sortedItems.forEach((item, index) => {
            item.style.order = String(index);
            if (index % itemsPerRow === 0) {
                item.setAttribute('is-in-first-column', '');
            } else {
                item.removeAttribute('is-in-first-column');
            }
        });
    }

    function setButtonActive(active) {
        const button = document.getElementById(BUTTON_ID);
        if (button) button.classList.toggle('is-active', active);
    }

    function sortByViews() {
        if (sortInProgress) return;

        const grid = getGrid();
        const items = getItems(grid);
        if (!grid || !items.length) return;

        sortInProgress = true;
        stopPagination();
        const sortedItems = items
            .map((item, index) => ({ item, views: getViewCount(item), index }))
            .sort((a, b) => (b.views - a.views) || (a.index - b.index))
            .map(({ item }) => item);

        normalizeGridLayout(grid, sortedItems);
        void grid.offsetHeight;
        setButtonActive(true);
        sortInProgress = false;
    }

    function getButtonContainer() {
        return (
            document.querySelector('ytd-rich-grid-renderer #header .ytChipBarViewModelChipBarScrollContainer') ||
            document.querySelector('ytd-rich-grid-renderer #header [role="tablist"]') ||
            document.querySelector('chip-bar-view-model .ytChipBarViewModelChipBarScrollContainer') ||
            document.querySelector('ytd-feed-filter-chip-bar-renderer #chips-content') ||
            document.querySelector('ytd-feed-filter-chip-bar-renderer #chips') ||
            document.querySelector('#chips-wrapper')
        );
    }

    function getFallbackContainer() {
        const existing = document.getElementById(FALLBACK_CONTAINER_ID);
        if (existing?.isConnected) return existing;

        const renderer = document.querySelector('ytd-rich-grid-renderer');
        const grid = getGrid();
        if (!renderer || !grid) return null;

        const fallback = document.createElement('div');
        fallback.id = FALLBACK_CONTAINER_ID;
        renderer.insertBefore(fallback, grid);
        return fallback;
    }

    function ensureButton() {
        if (!isChannelVideosPage()) return;

        const container = getButtonContainer() || getFallbackContainer();
        if (!container) return;

        let button = document.getElementById(BUTTON_ID);
        if (!button) {
            button = document.createElement('button');
            button.id = BUTTON_ID;
            button.type = 'button';
            button.textContent = 'Most Viewed';
            button.addEventListener('click', sortByViews);
        }

        if (button.parentElement !== container) {
            container.prepend(button);
        }
    }

    function cleanupButton() {
        document.getElementById(BUTTON_ID)?.remove();
        document.getElementById(FALLBACK_CONTAINER_ID)?.remove();
    }

    function refresh() {
        refreshTimer = 0;

        if (!isChannelVideosPage()) {
            paginationStopped = false;
            cleanupButton();
            return;
        }

        injectStyles();
        ensureButton();
    }

    function scheduleRefresh() {
        if (refreshTimer) return;
        refreshTimer = window.setTimeout(refresh, 100);
    }

    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            paginationStopped = false;
            cleanupButton();
        }
        removeContinuationNodes();
        scheduleRefresh();
    });

    window.addEventListener('yt-navigate-finish', () => {
        lastUrl = location.href;
        paginationStopped = false;
        cleanupButton();
        scheduleRefresh();
    });
    window.addEventListener('load', scheduleRefresh);

    scheduleRefresh();
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
