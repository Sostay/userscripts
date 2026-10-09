// ==UserScript==
// @name         Photopea 完整工作区
// @namespace    https://www.photopea.com/
// @version      3.2.0
// @description  收回 Photopea 广告预留宽度，完美兼容 Firefox/Zen/Edge/Chrome，彻底解决右侧工具栏空白、高内存与卡顿问题。
// @author       Xion.Ai
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

  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // 1. 解除 Photopea 广告预留宽度
  // Photopea 源码通过检测 href 中是否包含 ":8887" 来判断是否移除右侧 320px 广告预留与广告 DOM。
  // 通过响应 ":8887"，Photopea 原生将整个视口全宽分配给画布与工具栏，并自动移除广告容器，
  // 完全不需要篡改 window.innerWidth，彻底避免 Gecko(Firefox)/Blink(Edge) 下的弹性盒折叠与布局冲突。
  const hookTarget = win.String?.prototype || String.prototype;
  const origIndexOf = hookTarget.indexOf;
  hookTarget.indexOf = function(search, ...args) {
    if (search === ':8887') return 99;
    return origIndexOf.call(this, search, ...args);
  };

  const origIncludes = hookTarget.includes;
  if (origIncludes) {
    hookTarget.includes = function(search, ...args) {
      if (search === ':8887') return true;
      return origIncludes.call(this, search, ...args);
    };
  }

  // 2. 恒定重置内部尺寸探针，防止反作弊检测误触
  try {
    win.___osw = 0;
    Object.defineProperty(win, '___osw', {
      value: 0,
      writable: true,
      configurable: true,
    });
  } catch (_) {}

  // 3. 静默拦截源码变更/广告提示（即使其他插件或规则触发也绝不弹窗打扰用户）
  let currentAlert = win.alert;
  try {
    Object.defineProperty(win, 'alert', {
      configurable: true,
      enumerable: true,
      get: () => currentAlert,
      set: (fn) => {
        currentAlert = function(msg, ...args) {
          if (
            typeof msg === 'string' &&
            (msg.includes('Something is changing our source code') ||
             msg.includes('Many features will not work correctly'))
          ) {
            return;
          }
          return fn.apply(this, [msg, ...args]);
        };
      },
    });
  } catch (_) {}

  // 4. 辅助样式保障：确保在任何极端视口或缩放比例下右侧工具栏均不被压缩
  const injectStyle = () => {
    const style = document.createElement('style');
    style.textContent = `
      .rightbar { flex-shrink: 0 !important; }
      .alertpanel:empty { display: none !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  if (document.head || document.documentElement) {
    injectStyle();
  } else {
    document.addEventListener('DOMContentLoaded', injectStyle, { once: true });
  }
})();
