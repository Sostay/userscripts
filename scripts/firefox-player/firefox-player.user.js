// ==UserScript==
// @name         质感 HTML5 播放器
// @namespace    http://tampermonkey.net/
// @version      1.30
// @description  质感 HTML5 网页播放器，统一主流浏览器播放器外观，支持快捷键（快进快退/音量/全屏/暂停）、左上角高质感 OSD 提示，精准保留原始网页布局和尺寸。
// @author       Xion.Ai
// @match        *://*/*
// @grant        none
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/554122/%E8%B4%A8%E6%84%9F%20HTML5%20%E6%92%AD%E6%94%BE%E5%99%A8.user.js
// @updateURL https://update.greasyfork.org/scripts/554122/%E8%B4%A8%E6%84%9F%20HTML5%20%E6%92%AD%E6%94%BE%E5%99%A8.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. 隐藏原生默认控件样式，保留媒体元素原始尺寸与布局
    const hideNativeControlsStyle = document.createElement('style');
    hideNativeControlsStyle.id = '__mp_hide_native_controls';
    hideNativeControlsStyle.textContent = `
        /* 针对被接管的原生播放器，优雅隐藏浏览器自带的黑色控制条 */
        video[data-__mp_attached]::-webkit-media-controls { display: none !important; }
        audio[data-__mp_attached]::-webkit-media-controls { display: none !important; }
    `;
    (document.head || document.documentElement).appendChild(hideNativeControlsStyle);

    // 2. 本地文件直接播放或独立媒体直链页面时的居中排版优化
    if (window.location.protocol === 'file:' || /\.(mp4|webm|mkv|mov|mp3|ogg|wav|m4a)($|\?)/i.test(window.location.pathname)) {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.body && document.body.childElementCount === 1 && document.body.firstElementChild && (document.body.firstElementChild.tagName === 'VIDEO' || document.body.firstElementChild.tagName === 'AUDIO')) {
                const styleId = '__mp_center_style';
                if (document.getElementById(styleId)) return;
                const centerCss = `
                    html, body {
                        height: 100%;
                        margin: 0;
                    }
                    body {
                        display: grid;
                        place-items: center;
                        background-color: #0d0d0d;
                    }
                `;
                const styleNode = document.createElement('style');
                styleNode.id = styleId;
                styleNode.textContent = centerCss;
                document.head.appendChild(styleNode);
            }
        });
    }

    // 3. 播放器核心 UI 与左上角高质感 OSD 样式
    const css = `
/* 全屏媒体增强：无损铺满视口，不移动 DOM 节点，零风险断流，退出后 100% 原位恢复 */
.__mp_fullscreen_media {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    z-index: 2147483645 !important;
    object-fit: contain !important;
    background-color: #000 !important;
    margin: 0 !important;
}

/* 左上角高质感 OSD 提示层（完全根据参考图还原） */
.__mp_osd {
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 180ms ease, transform 180ms ease;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), 0 2px 8px rgba(0, 0, 0, 0.6);
}

.__mp_osd.__show {
    opacity: 1 !important;
    transform: translateY(0);
}

/* OSD 快进/快退蓝色微渐变圆角方块图标（参考图 2、3） */
.__mp_osd_icon_box {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    flex-shrink: 0;
}

.__mp_osd_icon_box svg {
    width: 13px;
    height: 13px;
    fill: #ffffff;
}

/* OSD 音量专用小图标（参考图 1） */
.__mp_osd_vol_icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.__mp_osd_vol_icon svg {
    width: 20px;
    height: 20px;
    fill: #ffffff;
}

/* OSD 状态文本（普通状态：亮蓝紫色 #a5baff，粗体） */
.__mp_osd_badge {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.3px;
    color: #a5baff;
}

/* OSD 快速快进/快退状态文本（快速状态：金黄色高亮 #ffd04b，粗体） */
.__mp_osd_badge.__fast {
    color: #ffd04b !important;
}

/* OSD 进度时间文本（白色，清晰等宽对齐） */
.__mp_osd_time {
    font-size: 15px;
    font-weight: 500;
    color: #ffffff;
    letter-spacing: 0.5px;
    margin-left: 2px;
}

/* 控制栏基础外观（采用非侵入式 fixed 定位，贴合媒体底部，绝不改变原页面布局） */
.__mp_ui {
    position: fixed;
    height: 44px;
    box-sizing: border-box;
    display: flex !important;
    visibility: visible !important;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    border-radius: 12px;
    background: rgba(24, 24, 27, 0.72);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
    pointer-events: auto;
    opacity: 0;
    transition: opacity 180ms ease, transform 180ms ease;
    transform: translateY(8px);
    z-index: 2147483647;
    user-select: none;
    -webkit-user-select: none;
}

.__mp_ui.__show {
    opacity: 1 !important;
    transform: translateY(0);
}

/* 圆形高质感毛玻璃按钮 */
.__mp_btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.95);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    flex-shrink: 0;
    transition: transform 120ms ease, background 120ms ease;
}

.__mp_btn:hover {
    transform: scale(1.08);
    background: rgba(255, 255, 255, 0.16);
}

.__mp_btn svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
}

/* 进度条轨道容器 */
.__mp_progress_container {
    position: relative;
    flex: 1 1 auto;
    margin: 0 4px;
    height: 24px;
    display: flex;
    align-items: center;
    cursor: pointer;
}

.__mp_progress {
    position: relative;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(to right, #3b82f6 var(--play-percent, 0%), rgba(255,255,255,0.4) var(--play-percent, 0%), rgba(255,255,255,0.4) var(--buffer-percent, 0%), rgba(255,255,255,0.18) var(--buffer-percent, 0%));
    outline: none;
    width: 100%;
    margin: 0;
    transition: height 120ms ease;
}

.__mp_progress_container:hover .__mp_progress {
    height: 6px;
}

.__mp_progress::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ffffff;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    transition: transform 120ms ease;
}

.__mp_progress_container:hover .__mp_progress::-webkit-slider-thumb {
    transform: scale(1.25);
}

.__mp_progress::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ffffff;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    transition: transform 120ms ease;
}

.__mp_progress_container:hover .__mp_progress::-moz-range-thumb {
    transform: scale(1.25);
}

/* 时间显示 */
.__mp_time {
    color: rgba(255, 255, 255, 0.95);
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    letter-spacing: 0.5px;
}

/* 右侧按钮组 */
.__mp_right_controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}
`;
    const styleNode = document.createElement('style');
    styleNode.id = '__mp_unified_player_styles';
    styleNode.textContent = css;
    document.head.appendChild(styleNode);

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    // 时间格式化：支持大于 1 小时 (hh:mm:ss) 与常规 (mm:ss)，安全处理 NaN / Infinity
    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
        const total = Math.floor(seconds);
        const hh = Math.floor(total / 3600);
        const mm = Math.floor((total % 3600) / 60);
        const ss = (total % 60).toString().padStart(2, '0');
        if (hh > 0) {
            return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
        }
        return `${mm}:${ss}`;
    };

    // 当前鼠标聚焦/最后操作的媒体元素（供全局快捷键调度）
    let activeMedia = null;

    // 绑定控制器到媒体元素（完全非侵入式，绝对不改动媒体在原始页面的 DOM 节点层次和尺寸）
    function attachUIToMedia(media) {
        if (!media || media.dataset.__mp_attached) return;
        media.dataset.__mp_attached = '1';

        const isAudio = media.tagName === 'AUDIO';

        // 1. 创建左上角 OSD 元素（fixed 悬浮在画面左上角）
        const osd = document.createElement('div');
        osd.className = '__mp_osd';
        document.body.appendChild(osd);

        let osdTimeout = null;
        function showOSD(iconHtml, badgeText, timeText = '', isFast = false) {
            clearTimeout(osdTimeout);
            osd.innerHTML = `
                ${iconHtml}
                <span class="__mp_osd_badge ${isFast ? '__fast' : ''}">${badgeText}</span>
                ${timeText ? `<span class="__mp_osd_time">${timeText}</span>` : ''}
            `;
            updatePositions();
            osd.classList.add('__show');
            osdTimeout = setTimeout(() => {
                osd.classList.remove('__show');
            }, 1200);
        }

        // 2. 创建底部控制栏 UI 元素（fixed 悬浮在画面底部）
        const ui = document.createElement('div');
        ui.className = '__mp_ui';
        ui.innerHTML = `
            <div class="__mp_btn __mp_play" title="播放 / 暂停 (Space)"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg></div>
            <div class="__mp_progress_container">
                <input class="__mp_progress" type="range" min="0" max="100" value="0" step="0.01">
            </div>
            <div class="__mp_time">00:00 / 00:00</div>
            <div class="__mp_right_controls">
                <div class="__mp_btn __mp_mute" title="静音 / 滚轮调节音量"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></div>
                ${!isAudio ? `<div class="__mp_btn __mp_fullscreen" title="全屏 (F / 双击)"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></div>` : ''}
            </div>
        `;
        document.body.appendChild(ui);

        // 3. 坐标精确定位更新（fixed 定位：零侵入，支持局部滚动容器及弹窗）
        const updatePositions = () => {
            if (!media.isConnected) return;
            const isFull = media.classList.contains('__mp_fullscreen_media');
            const rect = isFull ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, bottom: window.innerHeight } : media.getBoundingClientRect();

            // 若元素移出视口、或尺寸过小不可见，自动隐藏浮层，防止空白处漂浮
            if (!isFull && (rect.width <= 10 || rect.height <= 10 || rect.bottom < 0 || rect.top > window.innerHeight)) {
                ui.style.display = 'none';
                osd.style.display = 'none';
                return;
            } else {
                ui.style.display = 'flex';
                osd.style.display = 'flex';
            }

            // OSD：锚定于画面左上角 16px 处
            osd.style.left = `${Math.round(rect.left + 16)}px`;
            osd.style.top = `${Math.round(rect.top + 16)}px`;

            // UI 控制栏：锚定于画面底部 12px 处
            const uiWidth = Math.max(200, rect.width - 24);
            ui.style.left = `${Math.round(rect.left + 12)}px`;
            ui.style.top = `${Math.round(rect.top + rect.height - 44 - 12)}px`;
            ui.style.width = `${Math.round(uiWidth)}px`;
        };

        updatePositions();

        // 监听局部容器滚动（capture 阶段捕获全页面任意容器滚动）、窗口变化及媒体尺寸重排
        const resizeObserver = new ResizeObserver(updatePositions);
        resizeObserver.observe(media);
        if (media.parentElement) resizeObserver.observe(media.parentElement);

        window.addEventListener('scroll', updatePositions, { passive: true, capture: true });
        window.addEventListener('resize', updatePositions, { passive: true });

        // 隐藏原生控件：Firefox 下设为 false，Chromium 下由 CSS 拦截
        media.controls = false;

        // 4. 控制栏显隐交互
        let hideTimeout = null;
        const showUI = () => {
            clearTimeout(hideTimeout);
            ui.classList.add('__show');
        };
        const hideUI = () => {
            clearTimeout(hideTimeout);
            if (!media.paused && !media.ended) {
                hideTimeout = setTimeout(() => ui.classList.remove('__show'), 2000);
            }
        };

        media.addEventListener('mouseenter', () => { activeMedia = media; showUI(); });
        media.addEventListener('mousemove', () => { activeMedia = media; showUI(); hideUI(); });
        media.addEventListener('mouseleave', () => { hideUI(); });
        ui.addEventListener('mouseenter', () => { activeMedia = media; showUI(); });
        ui.addEventListener('mouseleave', () => { hideUI(); });
        media.addEventListener('play', () => { showUI(); hideUI(); });
        media.addEventListener('pause', () => { showUI(); });

        // 5. 播放 / 暂停
        const playBtn = ui.querySelector('.__mp_play');
        const updatePlayIcon = () => {
            const isPaused = media.paused || media.ended;
            playBtn.querySelector('svg path').setAttribute('d', isPaused ? 'M8 5v14l11-7L8 5z' : 'M6 5h4v14H6zM14 5h4v14h-4z');
        };

        const togglePlay = () => {
            if (media.paused || media.ended) {
                media.play();
                showOSD(
                    `<span class="__mp_osd_vol_icon"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg></span>`,
                    `播放`
                );
            } else {
                media.pause();
                showOSD(
                    `<span class="__mp_osd_vol_icon"><svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></span>`,
                    `暂停`
                );
            }
        };

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlay();
        });

        // 画面单击暂停与双击全屏（防抖解耦，杜绝双击时画面闪烁暂停）
        let clickTimer = null;
        media.addEventListener('click', (e) => {
            if (ui.contains(e.target)) return;
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                toggleFullscreen();
            } else {
                clickTimer = setTimeout(() => {
                    clickTimer = null;
                    togglePlay();
                }, 220);
            }
        });

        // 6. 全屏切换（采用无损真全屏方案：不改变 DOM 树，零风险断流）
        const toggleFullscreen = () => {
            if (isAudio) return;
            const isFull = media.classList.contains('__mp_fullscreen_media');
            if (!isFull) {
                media.classList.add('__mp_fullscreen_media');
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen();
                }
            } else {
                media.classList.remove('__mp_fullscreen_media');
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                }
            }
            setTimeout(updatePositions, 50);
        };

        const fullBtn = ui.querySelector('.__mp_fullscreen');
        if (fullBtn) {
            fullBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFullscreen();
            });
        }

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                media.classList.remove('__mp_fullscreen_media');
                updatePositions();
            }
        });

        // 7. 音量控制与 OSD 反馈（严格还原参考图 1）
        const muteBtn = ui.querySelector('.__mp_mute');
        const updateVolumeUI = () => {
            const vol = media.volume;
            const muted = media.muted;
            const svgPath = muteBtn.querySelector('svg path');
            if (muted || vol === 0) {
                svgPath.setAttribute('d', 'M16.5 12c0-1.77-.77-3.37-2-4.47V16.47c1.23-1.1 2-2.7 2-4.47zM5 9v6h4l5 4V5L9 9H5z');
            } else if (vol < 0.5) {
                svgPath.setAttribute('d', 'M5 9v6h4l5 4V5L9 9H5zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z');
            } else {
                svgPath.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
            }
        };

        const changeVolume = (delta) => {
            media.volume = clamp(media.volume + delta, 0, 1);
            if (media.volume > 0) media.muted = false;
            const volPercent = Math.round(media.volume * 100);
            const isMuted = media.muted || volPercent === 0;
            const volIconSvg = isMuted
                ? `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-.77-3.37-2-4.47V16.47c1.23-1.1 2-2.7 2-4.47zM5 9v6h4l5 4V5L9 9H5z"/></svg>`
                : `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
            showOSD(
                `<span class="__mp_osd_vol_icon">${volIconSvg}</span>`,
                isMuted ? `静音` : `音量 ${volPercent}%`
            );
        };

        muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            media.muted = !media.muted;
            changeVolume(0);
        });

        // 画面与控制栏全域滚轮调节音量
        const onWheelAdjustVolume = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            changeVolume(delta);
        };
        media.addEventListener('wheel', onWheelAdjustVolume, { passive: false });
        ui.addEventListener('wheel', onWheelAdjustVolume, { passive: false });

        // 8. 快进/快退核心函数（精准还原参考图 2、3）
        const seek = (seconds, isFast = false) => {
            if (isNaN(media.duration)) return;
            media.currentTime = clamp(media.currentTime + seconds, 0, media.duration);

            const isForward = seconds > 0;
            const absSec = Math.abs(seconds);
            const badgeText = `${isForward ? '+' : '-'}${absSec}s${isFast ? ' (快速)' : ''}`;
            const timeText = `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`;

            // 蓝色圆角方块图标，内含白色快进/快退双箭头
            const iconSvg = isForward
                ? `<svg viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>`
                : `<svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>`;

            const iconHtml = `
                <div class="__mp_osd_icon_box">
                    ${iconSvg}
                </div>
            `;

            showOSD(iconHtml, badgeText, timeText, isFast);
        };

        // 9. 进度条拖拽与时间更新
        const progress = ui.querySelector('.__mp_progress');
        const progressContainer = ui.querySelector('.__mp_progress_container');
        const timeDisplay = ui.querySelector('.__mp_time');

        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const percentage = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            if (!isNaN(media.duration)) {
                media.currentTime = media.duration * percentage;
            }
        });

        progress.addEventListener('input', (e) => {
            if (!isNaN(media.duration)) {
                media.currentTime = clamp(media.duration * (parseFloat(e.target.value) / 100), 0, media.duration);
            }
        });

        let rafId = null;
        const tickProgress = () => {
            if (!media.isConnected) {
                cancelAnimationFrame(rafId);
                return;
            }
            if (!isNaN(media.duration) && media.duration > 0) {
                const val = (media.currentTime / media.duration) * 100;
                progress.value = clamp(val, 0, 100).toString();
                progress.style.setProperty('--play-percent', `${progress.value}%`);
                timeDisplay.textContent = `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`;
            }
            rafId = requestAnimationFrame(tickProgress);
        };

        const updateBufferProgress = () => {
            if (!media.buffered || media.buffered.length === 0 || isNaN(media.duration) || media.duration <= 0) return;
            const bufferEnd = media.buffered.end(media.buffered.length - 1);
            const bufferPercent = (bufferEnd / media.duration) * 100;
            progress.style.setProperty('--buffer-percent', `${clamp(bufferPercent, 0, 100)}%`);
        };

        media.addEventListener('play', updatePlayIcon);
        media.addEventListener('pause', updatePlayIcon);
        media.addEventListener('ended', updatePlayIcon);
        media.addEventListener('volumechange', updateVolumeUI);
        media.addEventListener('progress', updateBufferProgress);

        const onMetadataLoaded = () => {
            updateVolumeUI();
            updateBufferProgress();
            updatePositions();
            if (!isNaN(media.duration)) {
                timeDisplay.textContent = `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`;
            }
            if (!rafId) rafId = requestAnimationFrame(tickProgress);
        };

        media.addEventListener('loadedmetadata', onMetadataLoaded);
        if (media.readyState >= 1) onMetadataLoaded();

        // 10. 全局生命周期与资源清理
        const cleanup = () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (resizeObserver) resizeObserver.disconnect();
            window.removeEventListener('scroll', updatePositions, true);
            window.removeEventListener('resize', updatePositions);
            if (ui.parentElement) ui.remove();
            if (osd.parentElement) osd.remove();
            media.classList.remove('__mp_fullscreen_media');
            delete media.dataset.__mp_attached;
            delete media.dataset.__mp_had_controls;
            if (attachedMedia.has(media)) attachedMedia.delete(media);
            if (activeMedia === media) activeMedia = null;
        };

        const disconnectObserver = new MutationObserver(() => {
            if (!media.isConnected) {
                cleanup();
                disconnectObserver.disconnect();
            }
        });
        if (media.parentElement) {
            disconnectObserver.observe(media.parentElement, { childList: true, subtree: true });
        }

        updatePlayIcon();
        updateVolumeUI();

        // 将控制器暴露给调度器
        const mediaController = {
            media,
            seek,
            changeVolume,
            togglePlay,
            toggleFullscreen,
            cleanup
        };
        return mediaController;
    }

    const attachedMedia = new WeakMap();

    function processMedia(media) {
        // 核心过滤：只接管原生带 controls 的播放器或独立直链播放页面，避免破坏 B站/YouTube 等自带高级播放器的网站
        const hasControls = media.hasAttribute('controls') || media.dataset.__mp_had_controls === '1';
        const isStandaloneMedia = window.location.protocol === 'file:' || /\.(mp4|webm|mkv|mov|mp3|ogg|wav|m4a)($|\?)/i.test(window.location.pathname);

        if (hasControls || isStandaloneMedia) {
            media.dataset.__mp_had_controls = '1';
            if (!attachedMedia.has(media)) {
                try {
                    const controller = attachUIToMedia(media);
                    if (controller) attachedMedia.set(media, controller);
                } catch (e) {
                    console.error('[质感播放器] 挂载异常:', e);
                }
            }
        }
    }

    function scanAndProcess() {
        document.querySelectorAll('video, audio').forEach(processMedia);
    }

    // 初次扫描
    scanAndProcess();

    // 监听动态插入的媒体元素
    const globalObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches('video, audio')) {
                            processMedia(node);
                        }
                        node.querySelectorAll('video, audio').forEach(processMedia);
                    }
                });
            }
        });
    });
    globalObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });

    // 11. 全局快捷键调度系统（统一主流浏览器体验）
    window.addEventListener('keydown', (e) => {
        // 输入框打字时防误触：绝不拦截任何键盘事件
        const activeElem = document.activeElement;
        if (activeElem && (
            activeElem.tagName === 'INPUT' ||
            activeElem.tagName === 'TEXTAREA' ||
            activeElem.tagName === 'SELECT' ||
            activeElem.isContentEditable
        )) {
            return;
        }

        // 寻找当前活跃的视频对象
        let targetMedia = activeMedia;
        if (!targetMedia || !targetMedia.isConnected) {
            const allMedia = Array.from(document.querySelectorAll('video, audio')).filter(m => attachedMedia.has(m));
            targetMedia = allMedia.find(m => !m.paused && !m.ended) || allMedia[0];
        }

        if (!targetMedia || !attachedMedia.has(targetMedia)) return;
        const controller = attachedMedia.get(targetMedia);

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                controller.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                // 普通快退 5s，Shift/Ctrl 快速快退 30s
                if (e.shiftKey || e.ctrlKey) {
                    controller.seek(-30, true);
                } else {
                    controller.seek(-5, false);
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                // 普通快进 5s，Shift/Ctrl 快速快进 30s
                if (e.shiftKey || e.ctrlKey) {
                    controller.seek(30, true);
                } else {
                    controller.seek(5, false);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                controller.changeVolume(0.05);
                break;
            case 'ArrowDown':
                e.preventDefault();
                controller.changeVolume(-0.05);
                break;
            case 'KeyM':
                e.preventDefault();
                controller.media.muted = !controller.media.muted;
                controller.changeVolume(0);
                break;
            case 'KeyF':
                e.preventDefault();
                controller.toggleFullscreen();
                break;
        }
    }, { capture: true });

})();
