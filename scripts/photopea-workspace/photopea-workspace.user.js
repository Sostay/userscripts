// ==UserScript==
// @name         Photopea 完整工作区
// @namespace    https://www.photopea.com/
// @version      3.1.1
// @description  收回 Photopea 广告预留宽度，并隐藏特定的源码变更提示。
// @match        https://www.photopea.com/*
// @match        https://photopea.com/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @inject-into  page
// @noframes
// @downloadURL https://update.greasyfork.org/scripts/599353/Photopea%20%E5%AE%8C%E6%95%B4%E5%B7%A5%E4%BD%9C%E5%8C%BA.user.js
// @updateURL https://update.greasyfork.org/scripts/599353/Photopea%20%E5%AE%8C%E6%95%B4%E5%B7%A5%E4%BD%9C%E5%8C%BA.meta.js
// ==/UserScript==

(() => {
  'use strict';

  const EXTRA_WIDTH = 320;
  const fallbackWidth = window.innerWidth;
  const marker = Symbol('photopea-full-width');
  let resizeQueued = false;
  let lastRelayout = 0;
  let scrollResetQueued = false;

  function resetHorizontalScroll() {
    if (scrollResetQueued) return;
    scrollResetQueued = true;
    requestAnimationFrame(() => {
      scrollResetQueued = false;
      if (document.documentElement) document.documentElement.scrollLeft = 0;
      if (document.body) document.body.scrollLeft = 0;
      if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
    });
  }

  function realWidth() {
    const visual = window.visualViewport?.width;
    if (Number.isFinite(visual) && visual > 0) return Math.round(visual);
    const documentWidth = document.documentElement?.clientWidth;
    return documentWidth > 0 ? documentWidth : fallbackWidth;
  }

  function installWidth() {
    const current = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    if (current?.get?.[marker]) return;
    const getter = () => realWidth() + EXTRA_WIDTH;
    getter[marker] = true;
    try {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        enumerable: true,
        get: getter,
      });
    } catch (_) {
      // Browser did not allow overriding the property.
    }
  }

  function relayout() {
    installWidth();
    if (resizeQueued) return;
    lastRelayout = Date.now();
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      window.dispatchEvent(new Event('resize'));
      resetHorizontalScroll();
      setTimeout(resetHorizontalScroll, 100);
    });
  }

  function hideSpecificNotice() {
    for (const alert of document.querySelectorAll('.alertcont')) {
      const message = alert.textContent || '';
      if (message.includes('Something is changing our source code') &&
          message.includes('Many features will not work correctly')) {
        alert.style.setProperty('display', 'none', 'important');
      }
    }
  }

  installWidth();

  // Early and delayed passes cover Photopea's initial layout and file opening.
  for (const delay of [0, 50, 200, 800, 2000, 5000]) {
    setTimeout(relayout, delay);
  }

  function start() {
    const style = document.createElement('style');
    style.textContent = 'html, body { overflow-x: clip !important; }';
    (document.head || document.documentElement).appendChild(style);
    hideSpecificNotice();

    let mutationTimer = 0;
    new MutationObserver(() => {
      hideSpecificNotice();
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(() => {
        const app = document.querySelector('.app');
        const editor = app?.firstElementChild;
        if (editor && editor.getBoundingClientRect().right < realWidth() - 60 &&
            Date.now() - lastRelayout > 1000) {
          relayout();
        }
      }, 150);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) relayout();
  });
  window.addEventListener('focus', relayout);
  window.addEventListener('scroll', resetHorizontalScroll, { passive: true });
  window.visualViewport?.addEventListener('resize', relayout, { passive: true });

  // Photopea or another extension may replace the getter during a session.
  setInterval(() => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    if (!descriptor?.get?.[marker]) relayout();
  }, 3000);
})();
