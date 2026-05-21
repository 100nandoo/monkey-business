// ==UserScript==
// @name         Audiobookshelf Quick Sleep Timers
// @namespace    https://violentmonkey.github.io/
// @version      2026-05-21
// @description  Press Command+Shift+1/2/3 to set the Audiobookshelf sleep timer to 1, 2, or 3 minutes.
// @author       100nandoo
// @homepageURL  https://github.com/100nandoo/monkey-business
// @supportURL   https://github.com/100nandoo/monkey-business/issues
// @icon         https://www.google.com/s2/favicons?sz=64&domain=audiobookshelf.org
// @downloadURL  https://raw.githubusercontent.com/100nandoo/monkey-business/main/adv-sleep-timer.user.js
// @match        http://192.168.50.150:13378/audiobookshelf/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SHORTCUT_MINUTES = {
    Digit1: 1,
    Digit2: 2,
    Digit3: 3
  };

  const SELECTORS = {
    sleepTimerButton: 'button[aria-label="Sleep timer"]',
    modal: '[role="dialog"]',
    minutesInput: 'input[placeholder="Time in minutes"]',
    submitButton: 'button'
  };

  function isEditableElement(element) {
    if (!element) return false;
    if (element.isContentEditable) return true;

    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    return ['input', 'textarea', 'select', 'button'].includes(tagName);
  }

  function getShortcutMinutes(event) {
    if (event.ctrlKey || event.altKey || !event.shiftKey || !event.metaKey) {
      return null;
    }

    return SHORTCUT_MINUTES[event.code] || null;
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function waitFor(getElement, timeoutMs = 3000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const element = getElement();
      if (element) return element;
      await sleep(50);
    }

    return null;
  }

  function getSleepTimerModal() {
    return Array.from(document.querySelectorAll(SELECTORS.modal)).find((modal) => {
      return /sleep timer/i.test(modal.textContent || '');
    }) || null;
  }

  function setNativeInputValue(input, value) {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function showToast(message, isError = false) {
    const existing = document.getElementById('vm-quick-sleep-timer-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'vm-quick-sleep-timer-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      padding: '10px 14px',
      borderRadius: '8px',
      background: isError ? 'rgba(153, 27, 27, 0.95)' : 'rgba(17, 24, 39, 0.95)',
      color: '#fff',
      fontSize: '14px',
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
    });

    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2200);
  }

  async function setSleepTimer(minutes) {
    const sleepTimerButton = document.querySelector(SELECTORS.sleepTimerButton);
    if (!sleepTimerButton) {
      showToast('Audiobookshelf player is not open.', true);
      return;
    }

    let modal = getSleepTimerModal();
    if (!modal) {
      sleepTimerButton.click();
      modal = await waitFor(getSleepTimerModal);
    }

    if (!modal) {
      showToast('Sleep timer modal did not open.', true);
      return;
    }

    const minutesInput = await waitFor(() => modal.querySelector(SELECTORS.minutesInput));
    if (!minutesInput) {
      showToast('Sleep timer input was not found.', true);
      return;
    }

    minutesInput.focus();
    setNativeInputValue(minutesInput, String(minutes));

    const submitButton = Array.from(modal.querySelectorAll(SELECTORS.submitButton)).find((button) => {
      return /submit/i.test(button.textContent || '');
    });

    if (!submitButton) {
      showToast('Sleep timer submit button was not found.', true);
      return;
    }

    submitButton.click();
    showToast(`Sleep timer set to ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }

  window.addEventListener(
    'keydown',
    (event) => {
      const minutes = getShortcutMinutes(event);
      if (!minutes) return;
      if (isEditableElement(event.target) || isEditableElement(document.activeElement)) return;

      event.preventDefault();
      event.stopPropagation();
      void setSleepTimer(minutes);
    },
    true
  );
})();
