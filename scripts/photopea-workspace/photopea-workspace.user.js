// ==UserScript==
// @name         Photopea 完整工作区
// @namespace    https://www.photopea.com/
// @version      3.2.1
// @description  收回 Photopea 广告预留宽度，完美兼容 Firefox/Zen/Edge/Chrome，彻底解决右侧工具栏空白、高内存、卡顿与横向漂移溢出问题。
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
  // Photopea 源码通过检测 href 中是否包含 ":8887" 来判断是否移除右侧广告预留与广告 DOM。
  // 通过响应 ":8887"，Photopea 原生将整个视口全宽分配给画布与工具栏，并自动移除广告容器。
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

  // 4. 彻底锁定横向滚动坐标，消除 Firefox/Zen 下的向右飘移与左侧工具栏溢出
  const resetScroll = () => {
    if (window.scrollX !== 0 || document.documentElement.scrollLeft !== 0 || (document.body && document.body.scrollLeft !== 0)) {
      window.scrollTo(0, window.scrollY);
      if (document.documentElement) document.documentElement.scrollLeft = 0;
      if (document.body) document.body.scrollLeft = 0;
    }
  };

  window.addEventListener('scroll', resetScroll, { passive: true });
  window.addEventListener('resize', resetScroll, { passive: true });

  // 5. 严格约束视口与 Flex 容器宽度，隐藏任何残留的广告元素，防止撑宽溢出
  const injectStyle = () => {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow-x: hidden !important;
        max-width: 100vw !important;
        width: 100% !important;
        position: relative !important;
      }
      .flexrow.app {
        max-width: 100vw !important;
        width: 100vw !important;
        overflow-x: hidden !important;
      }
      /* 隐藏主工作区外的任何兄弟元素（如广告容器） */
      .flexrow.app > div:not(:first-child) {
        display: none !important;
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        flex: 0 0 0px !important;
        overflow: hidden !important;
      }
      /* 主工作区占满视口 */
      .flexrow.app > div:first-child {
        width: 100% !important;
        max-width: 100vw !important;
        flex: 1 1 100% !important;
      }
      /* 右侧工具栏面板正常展开且不被弹性挤压 */
      .rightbar {
        flex-shrink: 0 !important;
      }
      .alertpanel:empty {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  if (document.head || document.documentElement) {
    injectStyle();
  } else {
    document.addEventListener('DOMContentLoaded', injectStyle, { once: true });
  }

  // 初次加载和就绪后复位一次滚动位置
  resetScroll();
  setTimeout(resetScroll, 100);
  setTimeout(resetScroll, 500);
})();
