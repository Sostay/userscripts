// ==UserScript==
// @name         Photopea 完整工作区
// @namespace    https://www.photopea.com/
// @version      3.2.6
// @description  收回 Photopea 广告预留宽度，完美兼容 Firefox/Zen/Edge/Chrome，彻底解决右侧工具栏空白、高内存、卡顿、折叠宽度异常与视口横向漂移问题。
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

  // 1. 极简安全样式：锁定横向溢出，并隐藏被挤出视口的广告容器
  // 完全不干预 .rightbar / .vcolumn 内部样式，由 Photopea 原生逻辑精准计算折叠与展开宽度
  function injectStyles() {
    const css = `
      html, body {
        overflow-x: clip !important;
      }
      /* 隐藏被挤出右侧屏幕的广告占位容器，杜绝任何溢出 */
      .flexrow.app > div:last-child:not(:first-child) {
        display: none !important;
        width: 0 !important;
        flex: 0 0 0px !important;
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

  // 2. 页面上下文核心逻辑函数（通过原生 <script> 注入真实页面，同时在沙盒中生效）
  function setupPageContext() {
    const win = window;
    const EXTRA_WIDTH = 320;
    const marker = Symbol('photopea-full-width');
    const fallbackWidth = win.innerWidth || 1920;

    // 核心：彻底解除 Photopea 的反作弊尺寸检测
    // Photopea 会读取 window.___osw，并在 Math.abs(innerWidth - ___osw - 320) < 12 时弹窗警告并强制覆盖 innerWidth。
    // 将 ___osw 锁定为 0，使 Photopea 的检测条件 (s && Math.abs(...) < 12) 永远为 false，永不误触警报。
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

    // 双重保险：拦截可能残留的源码修改警告弹窗
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

    // 劫持 innerWidth：返回 真实宽度 + 320
    // Photopea 原生布局公式为：工作区宽度 = window.innerWidth - 320。
    // 注入 +320 后，Photopea 原生算出的工作区刚好等于真实的 100% 视口，工具栏与面板全由原生自适应！
    // 配备空 setter，防止 Photopea 的 window.innerWidth = s 赋值破坏劫持。
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

    // 适时触发 resize，使 Photopea 在初次加载后完成自适应重绘
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
  }

  // 3. 在真实页面上下文中直接注入 <script>，无视任何扩展沙盒与 Xray 包装
  try {
    const s = document.createElement('script');
    s.textContent = `(${setupPageContext.toString()})();`;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (_) {
    setupPageContext();
  }

  // 4. 用户脚本环境同时也执行一次
  if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) {
    try {
      setupPageContext.call(unsafeWindow);
    } catch (_) {}
  }
})();
