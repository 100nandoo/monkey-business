// ==UserScript==
// @name         YouTube Channel Videos - Simple Most Viewed Button
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Add a simple "Most Viewed" button to sort videos by view count
// @match        https://www.youtube.com/*/videos
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function parseViews(text) {
        const match = text?.match(/([\d.,]+)([MK]?)\s+views/i);
        if (!match) return 0;
        let [_, number, suffix] = match;
        let value = parseFloat(number.replace(/,/g, ''));
        if (suffix === 'M') value *= 1000000;
        else if (suffix === 'K') value *= 1000;
        return value;
    }

    function sortByViews() {
        const grid = document.querySelector('ytd-rich-grid-renderer #contents');
        if (!grid) return;

        const items = Array.from(grid.querySelectorAll('ytd-rich-item-renderer'));
        const enriched = items.map(item => {
            const viewText = item.querySelector('#metadata-line span')?.innerText || '';
            const views = parseViews(viewText);
            return { item, views };
        });

        enriched.sort((a, b) => b.views - a.views);
        while (grid.firstChild) {
            grid.removeChild(grid.firstChild);
        }
        enriched.forEach(({ item }) => grid.appendChild(item));
    }

    function createSimpleButton() {
        const container = document.querySelector('#chips-wrapper') || 
                         document.querySelector('ytd-browse[page-subtype="channels"] #container');
        if (!container || document.getElementById('mostViewedBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'mostViewedBtn';
        btn.textContent = 'Most Viewed';
        btn.style.cssText = `
            margin: 0 12px 0 0;
            padding: 0 16px;
            height: 32px;
            border-radius: 16px;
            border: none;
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 14px;
            cursor: pointer;
        `;
        btn.addEventListener('click', sortByViews);

        container.appendChild(btn);
    }

    // Try to add button immediately
    createSimpleButton();

    // If not ready yet, check every 500ms
    const interval = setInterval(() => {
        if (document.querySelector('ytd-rich-item-renderer')) {
            createSimpleButton();
            clearInterval(interval);
        }
    }, 500);
})();