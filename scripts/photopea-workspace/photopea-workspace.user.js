// ==UserScript==
// @name         Photopea 完整工作区
// @namespace    https://www.photopea.com/
// @version      3.2.4
// @description  收回 Photopea 广告预留宽度，完美兼容 Firefox/Zen/Edge/Chrome，彻底解决右侧工具栏空白、高内存、卡顿与视口横向漂移溢出问题。
// @author       Xion.Ai
// @match        https://www.photopea.com/*
// @match        https://photopea.com/*
// @run-at       document-start
// @grant        none
// @noframes
// @downloadURL https://update.greasyfork.org/scripts/599353/Photopea%20%E5%AE%8C%E6%95%B4%E5%B7%A5%E4%BD%9C%E5%8C%BA.user.js
// @updateURL https://update.greasyfork.org/scripts/599353/Photopea%20%E5%AE%8C%E6%95%B4%E5%B7%A5%E4%BD%9C%E5%8C%BA.meta.js
// ==/UserScript==

(() => {
  'use strict';

  // 1. 样式层保障（在任何浏览器中优先注入）
  // 核心解决 Firefox/Gecko 弹性盒将右侧面板压缩为 0 像素的顽疾：
  // a) 强制 .rightbar 最小宽度与 flex-shrink: 0，永不被画布压缩消失
  // b) 允许中间画布容器 min-width: 0 弹性收缩
  // c) 彻底隐藏末尾的 320px 广告占位容器
  // d) 全局锁定横向滚动 (overflow-x: clip)
  function injectStyles() {
    const css = `
      html, body {
        overflow-x: clip !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
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
      /* 主工作区占满视口 */
      .flexrow.app > div:first-child {
        width: 100% !important;
        max-width: 100% !important;
      }
      /* 核心：右侧工具栏面板在 Firefox/Zen 下绝不被弹性盒压缩折叠为 0 */
      .rightbar {
        flex-shrink: 0 !important;
        min-width: 268px !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .rightbar .vcolumn:not(.collapsed) {
        min-width: 268px !important;
      }
      .rightbar .vcolumn.collapsed {
        min-width: 3em !important;
        width: 3em !important;
      }
      /* 允许中间画布区域弹性自适应收缩，把宽度留给右侧面板 */
      .flexrow.app .flexrow > div:not(.rightbar) {
        min-width: 0 !important;
      }
      .alertpanel:empty {
        display: none !important;
      }
    `;
    const style = document.createElement('style');
    style.id = 'photopea-full-workspace-style';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  if (document.head || document.documentElement) {
    injectStyles();
  } else {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  }

  // 2. 页面上下文核心逻辑函数（同时用于原生注入与沙盒执行）
  function setupPageContext() {
    const win = window;
    const EXTRA_WIDTH = 320;
    const marker = Symbol('photopea-full-width');
    const fallbackWidth = win.innerWidth || 1920;

    // 彻底解除 Photopea 的反作弊尺寸检测
    try {
      Object.defineProperty(win, '___osw', {
        configurable: true,
        enumerable: true,
        get: () => 0,
        set: () => {},
      });
    } catch (_) {
      win.___osw = 0;
    }

    // 静默拦截可能残留的源码修改警告弹窗
    const origAlert = win.alert;
    win.alert = function (msg, ...args) {
      if (
        typeof msg === 'string' &&
        (msg.includes('Something is changing our source code') ||
          msg.includes('Many features will not work correctly'))
      ) {
        return;
      }
      return origAlert ? origAlert.apply(this, [msg, ...args]) : undefined;
    };

    function getRealWidth() {
      const visual = win.visualViewport?.width;
      if (Number.isFinite(visual) && visual > 0) return Math.round(visual);
      const docW = win.document?.documentElement?.clientWidth;
      if (Number.isFinite(docW) && docW > 0) return docW;
      return win.outerWidth || fallbackWidth;
    }

    function installWidth() {
      const desc = Object.getOwnPropertyDescriptor(win, 'innerWidth');
      if (desc?.get?.[marker]) return;
      const getter = () => {
        const rw = getRealWidth();
        return rw > 0 ? rw + EXTRA_WIDTH : rw;
      };
      getter[marker] = true;
      try {
        Object.defineProperty(win, 'innerWidth', {
          configurable: true,
          enumerable: true,
          get: getter,
          set: () => {},
        });
      } catch (_) {}
    }

    installWidth();

    function relayout() {
      installWidth();
      win.dispatchEvent(new Event('resize'));
    }

    for (const delay of [0, 50, 150, 400, 1000, 2500]) {
      setTimeout(relayout, delay);
    }

    setInterval(() => {
      installWidth();
    }, 3000);

    console.log('[Photopea 完整工作区 v3.2.4] 注入成功，当前视口修正宽度:', win.innerWidth);
  }

  // 3. 在真实页面上下文中直接注入 <script>，无视 Firefox Xray 包装与扩展沙盒
  try {
    const s = document.createElement('script');
    s.textContent = `(${setupPageContext.toString()})();`;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (_) {
    // 降级为直接执行
    setupPageContext();
  }

  // 4. 用户脚本环境同时也执行一次
  if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) {
    try {
      setupPageContext.call(unsafeWindow);
    } catch (_) {}
  }
})();
