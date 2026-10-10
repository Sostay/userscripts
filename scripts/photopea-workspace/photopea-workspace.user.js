// ==UserScript==
// @name         Photopea 完整工作区
// @namespace    https://www.photopea.com/
// @version      3.2.3
// @description  收回 Photopea 广告预留宽度，完美兼容 Firefox/Zen/Edge/Chrome，彻底解决右侧工具栏空白、高内存、卡顿与视口横向漂移溢出问题。
// @author       Xion.Ai
// @match        https://www.photopea.com/*
// @match        https://photopea.com/*
// @run-at       document-start
// @grant        none
// @inject-into  page
// @noframes
// @downloadURL https://update.greasyfork.org/scripts/599353/Photopea%20%E5%AE%8C%E6%95%B4%E5%B7%A5%E4%BD%9C%E5%8C%BA.user.js
// @updateURL https://update.greasyfork.org/scripts/599353/Photopea%20%E5%AE%8C%E6%95%B4%E5%B7%A5%E4%BD%9C%E5%8C%BA.meta.js
// ==/UserScript==

(() => {
  'use strict';

  // 在 Firefox/Zen 及 Chromium 下同时劫持 page window 与沙盒 window
  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const EXTRA_WIDTH = 320;
  const marker = Symbol('photopea-full-width');
  const fallbackWidth = win.innerWidth || 1920;

  // 1. 彻底解除 Photopea 的反作弊尺寸检测
  // Photopea 会读取 window.___osw，并在 Math.abs(innerWidth - ___osw - 320) < 12 时弹窗警告并强制覆盖 innerWidth。
  // 将 ___osw 恒定锁定为 0，使 Photopea 的检测条件 (s && Math.abs(...) < 12) 永远为 false，永不触发警报。
  function disarmAntiTamper() {
    for (const target of [win, window]) {
      if (!target) continue;
      try {
        Object.defineProperty(target, '___osw', {
          configurable: true,
          enumerable: true,
          get: () => 0,
          set: () => {},
        });
      } catch (_) {
        target.___osw = 0;
      }
    }
  }

  // 2. 双重防御：静默拦截可能残留的源码修改警告弹窗
  function suppressNotice() {
    for (const target of [win, window]) {
      if (!target) continue;
      const orig = target.alert;
      if (orig?.[marker]) continue;
      const patched = function (msg, ...args) {
        if (
          typeof msg === 'string' &&
          (msg.includes('Something is changing our source code') ||
            msg.includes('Many features will not work correctly'))
        ) {
          return;
        }
        return orig ? orig.apply(this, [msg, ...args]) : undefined;
      };
      patched[marker] = true;
      try {
        target.alert = patched;
      } catch (_) {}
    }
  }

  // 3. 计算真实视口宽度并精确注入 EXTRA_WIDTH
  // Photopea 的原生布局计算公式为：工作区宽度 = window.innerWidth - 320。
  // 通过向 innerWidth 注入 +320，使 Photopea 计算出的工作区刚好等于真实的 100% 视口宽度。
  // 配备空 setter，防止 Photopea 的 window.innerWidth = s 赋值破坏劫持。
  function realWidth() {
    const visual = win.visualViewport?.width;
    if (Number.isFinite(visual) && visual > 0) return Math.round(visual);
    const documentWidth = win.document?.documentElement?.clientWidth;
    if (Number.isFinite(documentWidth) && documentWidth > 0) return documentWidth;
    return win.outerWidth || fallbackWidth;
  }

  function installWidth() {
    for (const target of [win, window]) {
      if (!target) continue;
      const desc = Object.getOwnPropertyDescriptor(target, 'innerWidth');
      if (desc?.get?.[marker]) continue;
      const getter = () => {
        const rw = realWidth();
        return rw > 0 ? rw + EXTRA_WIDTH : rw;
      };
      getter[marker] = true;
      try {
        Object.defineProperty(target, 'innerWidth', {
          configurable: true,
          enumerable: true,
          get: getter,
          set: () => {},
        });
      } catch (_) {}
    }
  }

  // 4. 彻底锁定横向滚动坐标，消除任何原因导致的横向漂移
  function resetScroll() {
    if (document.documentElement && document.documentElement.scrollLeft !== 0) {
      document.documentElement.scrollLeft = 0;
    }
    if (document.body && document.body.scrollLeft !== 0) {
      document.body.scrollLeft = 0;
    }
    if (win.scrollX !== 0) {
      win.scrollTo(0, win.scrollY);
    }
  }

  win.addEventListener('scroll', resetScroll, { capture: true, passive: true });
  win.addEventListener('resize', resetScroll, { passive: true });

  // 5. 样式层保障：
  // a) 强制右侧工具栏面板在 Firefox/Gecko 下绝不被弹性盒压缩折叠消失 (.rightbar flex-shrink: 0)
  // b) 彻底隐藏位于末尾被挤出视口的广告容器 (.flexrow.app > div:last-child:not(:first-child))
  // c) 消除页面横向滚动
  function injectStyle() {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow-x: clip !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* 右侧工具栏面板在 Firefox 下绝不被弹性盒压缩折叠 */
      .rightbar {
        flex-shrink: 0 !important;
      }
      /* 隐藏 .flexrow.app 尾部的广告容器（消除多余的 320px 宽度） */
      .flexrow.app > div:last-child:not(:first-child) {
        display: none !important;
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        flex: 0 0 0px !important;
        overflow: hidden !important;
        visibility: hidden !important;
      }
      .alertpanel:empty {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  if (document.head || document.documentElement) {
    injectStyle();
  } else {
    document.addEventListener('DOMContentLoaded', injectStyle, { once: true });
  }

  // 6. 执行初始化
  disarmAntiTamper();
  suppressNotice();
  installWidth();

  function relayout() {
    disarmAntiTamper();
    suppressNotice();
    installWidth();
    win.dispatchEvent(new Event('resize'));
    resetScroll();
  }

  for (const delay of [0, 50, 150, 400, 1000, 2500]) {
    setTimeout(relayout, delay);
  }

  // 周期性温和检查（不重复触发 resize，避免任何死循环）
  setInterval(() => {
    disarmAntiTamper();
    installWidth();
  }, 3000);
})();
