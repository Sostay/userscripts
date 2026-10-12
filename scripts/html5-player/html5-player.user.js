// ==UserScript==
// @name         质感 HTML5 播放器
// @name:zh-CN   质感 HTML5 播放器
// @name:en      Unified HTML5 Player
// @namespace    http://tampermonkey.net/
// @version      1.43
// @description  质感 HTML5 网页播放器，统一主流浏览器播放器外观，无背景框通透控制栏，支持丰富快捷键（倍速循环切换/逐帧微调/快进快退/音量/画中画/截图/Ctrl+C复制当前帧/全屏/镜像翻转）、左上角高质感 OSD 提示，精准保留原始网页布局和音频排版尺寸。
// @description:zh-CN 质感 HTML5 网页播放器，统一主流浏览器播放器外观，无背景框通透控制栏，支持丰富快捷键（倍速循环切换/逐帧微调/快进快退/音量/画中画/截图/Ctrl+C复制当前帧/全屏/镜像翻转）、左上角高质感 OSD 提示，精准保留原始网页布局和音频排版尺寸。
// @description:en A unified, modern HTML5 media player for all browsers, featuring custom OSD, rich shortcuts (speed toggle, frame stepping, seek, volume, PiP, screenshot, Ctrl+C copy frame, fullscreen, flip), clean borderless controls, and zero-layout-shift non-intrusive design.
// @author       Xion.Ai
// @match        *://*/*
// @match        file:///*
// @match        file://*/*
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
    const isStandalonePage = window.location.protocol === 'file:' || /\.(mp4|webm|mkv|mov|mp3|ogg|wav|m4a)($|\?)/i.test(window.location.pathname);
    if (isStandalonePage) {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.body && document.body.childElementCount <= 2) {
                const styleId = '__mp_center_style';
                if (document.getElementById(styleId)) return;
                const centerCss = `
                    html, body {
                        height: 100%;
                        margin: 0;
                        padding: 0;
                        background-color: #0d0d0d !important;
                    }
                    body {
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: center !important;
                        align-items: center !important;
                        overflow: hidden !important;
                    }
                    body > video {
                        max-width: 100vw !important;
                        max-height: 100vh !important;
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

/* OSD 通用功能小图标 */
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

/* OSD 金黄色高亮状态（快速快进/快退、倍速非1.0状态） */
.__mp_osd_badge.__fast {
    color: #ffd04b !important;
}

/* OSD 进度时间/辅助参数文本（白色，清晰等宽对齐） */
.__mp_osd_time {
    font-size: 15px;
    font-weight: 500;
    color: #ffffff;
    letter-spacing: 0.5px;
    margin-left: 2px;
}

/* 视频控制栏基础属性（fixed 悬浮模式） */
.__mp_ui.__mp_video_ui {
    position: fixed;
    height: 40px;
    box-sizing: border-box;
    display: flex !important;
    visibility: visible !important;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 180ms ease, transform 180ms ease;
    transform: translateY(6px);
    z-index: 2147483647;
    user-select: none;
    -webkit-user-select: none;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    padding: 0 4px !important;
}

.__mp_ui.__mp_video_ui.__show {
    opacity: 1 !important;
    transform: translateY(0);
}

/* 视频控制栏按钮：毛玻璃小圆底与投影，复杂画面下清晰可读 */
.__mp_ui.__mp_video_ui .__mp_btn {
    background: rgba(0, 0, 0, 0.38) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45) !important;
}

.__mp_ui.__mp_video_ui .__mp_btn:hover {
    background: rgba(0, 0, 0, 0.58) !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
}

.__mp_ui.__mp_video_ui .__mp_time {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.7);
}

.__mp_ui.__mp_video_ui .__mp_progress {
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.6));
}

/* 音频播放器控制栏：原位替换文档流胶囊设计（核心解决表格错位堆叠问题） */
.__mp_ui.__mp_audio_ui {
    position: relative !important;
    display: inline-flex !important;
    visibility: visible !important;
    vertical-align: middle !important;
    box-sizing: border-box !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 0 12px !important;
    height: 40px !important;
    width: 100% !important;
    max-width: 340px !important;
    min-width: 160px !important;
    border-radius: 20px !important;
    background: rgba(28, 28, 34, 0.45) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
    opacity: 1 !important;
    transform: none !important;
    pointer-events: auto !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    margin: 4px 0 !important;
}

/* 独立播放音频页面居中长胶囊 */
body > .__mp_ui.__mp_audio_ui {
    max-width: min(840px, 90vw) !important;
    width: min(840px, 90vw) !important;
    margin: 0 auto !important;
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
    transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}

.__mp_btn:hover {
    transform: scale(1.08);
    background: rgba(255, 255, 255, 0.18);
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
    background: linear-gradient(to right, #3b82f6 var(--play-percent, 0%), rgba(255,255,255,0.4) var(--play-percent, 0%), rgba(255,255,255,0.4) var(--buffer-percent, 0%), rgba(255,255,255,0.2) var(--buffer-percent, 0%));
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
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
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
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
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

    // 绑定控制器到媒体元素（视频采用 fixed 浮层，音频采用 DOM 原位替换，彻底杜绝表格错位）
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
            updateOSDPosition();
            osd.classList.add('__show');
            osdTimeout = setTimeout(() => {
                osd.classList.remove('__show');
            }, 1200);
        }

        // 2. 创建控制栏 UI 元素
        const ui = document.createElement('div');
        ui.className = `__mp_ui ${isAudio ? '__mp_audio_ui' : '__mp_video_ui'}`;
        ui.innerHTML = `
            <div class="__mp_btn __mp_play" title="播放 / 暂停 (Space)"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg></div>
            <div class="__mp_progress_container">
                <input class="__mp_progress" type="range" min="0" max="100" value="0" step="0.01">
            </div>
            <div class="__mp_time">00:00 / 00:00</div>
            <div class="__mp_right_controls">
                <div class="__mp_btn __mp_mute" title="静音 (M) / 滚轮调节音量"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></div>
                ${!isAudio ? `<div class="__mp_btn __mp_fullscreen" title="全屏 (Enter / 双击)"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></div>` : ''}
            </div>
        `;

        // 核心挂载策略：
        // 视频：挂载在 body，使用 fixed 贴合在视频画面底部
        // 音频：直接作为兄弟节点插入在 audio 原位置，原 audio 隐藏，完美占据表格/段落中的原位槽位！
        if (isAudio) {
            media.style.display = 'none';
            media.after(ui);
        } else {
            document.body.appendChild(ui);
        }

        // 3. 坐标定位更新
        const updateOSDPosition = () => {
            const anchor = isAudio ? ui : media;
            if (!anchor.isConnected) return;
            const rect = anchor.getBoundingClientRect();
            osd.style.left = `${Math.round(clamp(rect.left + 14, 10, window.innerWidth - 180))}px`;
            osd.style.top = `${Math.round(clamp(rect.top + (isAudio ? -42 : 14), 10, window.innerHeight - 50))}px`;
        };

        const updatePositions = () => {
            if (!media.isConnected) return;
            updateOSDPosition();

            // 音频已经在文档流中自适应，不需要也绝不应计算 fixed 坐标
            if (isAudio) return;

            const isFull = media.classList.contains('__mp_fullscreen_media');
            const rect = isFull ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, bottom: window.innerHeight } : media.getBoundingClientRect();

            if (!isFull && (rect.width <= 10 || rect.height <= 10 || rect.bottom < 0 || rect.top > window.innerHeight)) {
                ui.style.display = 'none';
                osd.style.display = 'none';
                return;
            } else {
                ui.style.display = 'flex';
                osd.style.display = 'flex';
            }

            const uiWidth = Math.max(180, rect.width - 16);
            ui.style.left = `${Math.round(rect.left + 8)}px`;
            ui.style.top = `${Math.round(rect.top + rect.height - 40 - 4)}px`;
            ui.style.width = `${Math.round(uiWidth)}px`;
        };

        updatePositions();

        const resizeObserver = new ResizeObserver(updatePositions);
        resizeObserver.observe(media);
        if (media.parentElement) resizeObserver.observe(media.parentElement);

        window.addEventListener('scroll', updatePositions, { passive: true, capture: true });
        window.addEventListener('resize', updatePositions, { passive: true });

        media.controls = false;

        // 4. 控制栏显隐交互
        let hideTimeout = null;
        const showUI = () => {
            if (isAudio) return; // 音频始终可见
            clearTimeout(hideTimeout);
            ui.classList.add('__show');
        };
        const hideUI = () => {
            if (isAudio) return;
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

        // 画面单击暂停与双击全屏（防抖解耦）
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

        // 6. 全屏切换
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

        // 7. 音量控制与 OSD 反馈
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

        // 8. 快进/快退核心函数
        const seek = (seconds, isFast = false) => {
            if (isNaN(media.duration)) return;
            media.currentTime = clamp(media.currentTime + seconds, 0, media.duration);

            const isForward = seconds > 0;
            const absSec = Math.abs(seconds);
            const badgeText = `${isForward ? '+' : '-'}${absSec}s${isFast ? ' (快速)' : ''}`;
            const timeText = `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`;

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

        // 9. 倍速无级调节与记忆循环切换 (X 减速 / C 加速 / Z 双向切换)
        let lastCustomRate = 2.0;

        const setRate = (delta) => {
            let rate = Math.round((media.playbackRate + delta) * 10) / 10;
            rate = clamp(rate, 0.1, 16.0);
            media.playbackRate = rate;
            if (rate !== 1.0) {
                lastCustomRate = rate;
            }
            const isFast = rate > 1.0;
            const speedIconSvg = `<svg viewBox="0 0 24 24"><path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.43zM10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/></svg>`;
            showOSD(
                `<span class="__mp_osd_vol_icon">${speedIconSvg}</span>`,
                `播放速度 ${rate.toFixed(1)}x`,
                '',
                isFast
            );
        };

        const toggleRate = () => {
            const speedIconSvg = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg></span>`;
            if (media.playbackRate !== 1.0) {
                // 当前处于非 1.0 倍速，记忆它并切回 1.0
                lastCustomRate = media.playbackRate;
                media.playbackRate = 1.0;
                showOSD(
                    `<span class="__mp_osd_vol_icon">${speedIconSvg}</span>`,
                    `恢复正常速度 1.0x`
                );
            } else {
                // 当前处于 1.0 正常速度，循环切回上次的记忆倍速（默认 2.0x）
                const targetRate = clamp(lastCustomRate || 2.0, 0.1, 16.0);
                media.playbackRate = targetRate;
                showOSD(
                    `<span class="__mp_osd_vol_icon">${speedIconSvg}</span>`,
                    `切换倍速 ${targetRate.toFixed(1)}x`,
                    '',
                    targetRate > 1.0
                );
            }
        };

        // 10. 逐帧微调 (D 上一帧 / F 下一帧)
        const frameStep = 1 / 30; // 约 0.0333s 单帧时间
        const prevFrame = () => {
            if (isNaN(media.duration)) return;
            media.pause();
            media.currentTime = clamp(media.currentTime - frameStep, 0, media.duration);
            const iconSvg = `<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`;
            showOSD(
                `<span class="__mp_osd_vol_icon">${iconSvg}</span>`,
                `上一帧`,
                `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`
            );
        };

        const nextFrame = () => {
            if (isNaN(media.duration)) return;
            media.pause();
            media.currentTime = clamp(media.currentTime + frameStep, 0, media.duration);
            const iconSvg = `<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`;
            showOSD(
                `<span class="__mp_osd_vol_icon">${iconSvg}</span>`,
                `下一帧`,
                `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`
            );
        };

        // 11. 画面水平镜像状态
        let isFlipped = false;
        const toggleFlip = () => {
            if (isAudio) return;
            isFlipped = !isFlipped;
            media.style.transform = isFlipped ? 'scaleX(-1)' : '';
            const flipSvg = `<svg viewBox="0 0 24 24"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2z"/></svg>`;
            showOSD(
                `<span class="__mp_osd_vol_icon">${flipSvg}</span>`,
                isFlipped ? `画面镜像 (开启)` : `画面镜像 (关闭)`
            );
        };

        // 12. 画面截图下载 (Shift + S)
        const captureFrame = () => {
            if (isAudio || !media.videoWidth || !media.videoHeight) return;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = media.videoWidth;
                canvas.height = media.videoHeight;
                const ctx = canvas.getContext('2d');
                if (isFlipped) {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `screenshot_${formatTime(media.currentTime).replace(':', '-')}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    const camSvg = `<svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`;
                    showOSD(
                        `<span class="__mp_osd_vol_icon">${camSvg}</span>`,
                        `已截图保存`,
                        `${media.videoWidth}x${media.videoHeight}`
                    );
                }, 'image/png');
            } catch (err) {
                console.warn('[质感播放器] 截图受跨域资源保护限制:', err);
            }
        };

        // 13. 复制视频当前帧画面到剪贴板 (Ctrl + C)
        const copyFrame = () => {
            if (isAudio || !media.videoWidth || !media.videoHeight) return;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = media.videoWidth;
                canvas.height = media.videoHeight;
                const ctx = canvas.getContext('2d');
                if (isFlipped) {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    try {
                        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                            const item = new ClipboardItem({ 'image/png': blob });
                            await navigator.clipboard.write([item]);
                            const copySvg = `<svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 16H5V5h2v3h10V5h2v14z"/></svg>`;
                            showOSD(
                                `<span class="__mp_osd_vol_icon">${copySvg}</span>`,
                                `已复制画面到剪贴板`,
                                `${media.videoWidth}x${media.videoHeight}`
                            );
                        } else {
                            throw new Error('ClipboardItem not supported');
                        }
                    } catch (clipErr) {
                        console.warn('[质感播放器] 写入剪贴板失败:', clipErr);
                        showOSD(
                            `<span class="__mp_osd_vol_icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></span>`,
                            `剪贴板写入受限`
                        );
                    }
                }, 'image/png');
            } catch (err) {
                console.warn('[质感播放器] 复制画面受跨域资源保护限制:', err);
                showOSD(
                    `<span class="__mp_osd_vol_icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></span>`,
                    `视频受跨域保护无法复制`
                );
            }
        };

        // 14. 画中画切换 (Shift + P)
        const togglePiP = () => {
            if (isAudio || !document.pictureInPictureEnabled) return;
            const pipSvg = `<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;
            if (document.pictureInPictureElement === media) {
                document.exitPictureInPicture().catch(() => {});
                showOSD(`<span class="__mp_osd_vol_icon">${pipSvg}</span>`, `退出画中画`);
            } else {
                media.requestPictureInPicture().then(() => {
                    showOSD(`<span class="__mp_osd_vol_icon">${pipSvg}</span>`, `开启画中画`);
                }).catch(() => {});
            }
        };

        // 14. 进度条拖拽与时间更新
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

        // 15. 全局生命周期与资源清理
        const cleanup = () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (resizeObserver) resizeObserver.disconnect();
            window.removeEventListener('scroll', updatePositions, true);
            window.removeEventListener('resize', updatePositions);
            if (ui.parentElement) ui.remove();
            if (osd.parentElement) osd.remove();
            if (isAudio) media.style.display = '';
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
            setRate,
            toggleRate,
            prevFrame,
            nextFrame,
            captureFrame,
            copyFrame,
            togglePiP,
            toggleFlip,
            cleanup
        };
        return mediaController;
    }

    const attachedMedia = new WeakMap();

    function processMedia(media) {
        // 核心过滤：接管原生 controls、独立媒体直链、或者本地 file: 播放的音频/视频
        const hasControls = media.hasAttribute('controls') || media.dataset.__mp_had_controls === '1';
        const isStandalone = isStandalonePage || (document.body && document.body.childElementCount <= 2 && (media.parentElement === document.body || media.parentElement?.parentElement === document.body));

        if (hasControls || isStandalone) {
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

    // 16. 全局全能快捷键调度系统（统一全主流浏览器体验，严格规避系统与浏览器快捷键冲突）
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

        // 彻底放行所有 Alt 组合键（如 Alt+D 聚焦地址栏、Alt+← 历史后退、Alt+F 等）与 Meta/Command 键
        if (e.altKey || e.metaKey) {
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

        // 如果按下了 Ctrl 键，处理特定绑定的快速跳转、音量调节以及 Ctrl+C 复制当前帧画面
        if (e.ctrlKey) {
            switch (e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    controller.seek(-30, true);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    controller.seek(30, true);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    controller.changeVolume(0.20);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    controller.changeVolume(-0.20);
                    break;
                case 'KeyC':
                    // 如果用户在页面上选中文本，优先放行让浏览器原生复制文字
                    const sel = window.getSelection ? window.getSelection().toString() : '';
                    if (sel && sel.trim().length > 0) {
                        return;
                    }
                    if (controller.copyFrame) {
                        e.preventDefault();
                        controller.copyFrame();
                    }
                    break;
            }
            return;
        }

        // 如果按下了 Shift 键，仅处理特定绑定的功能，其余全部放行
        if (e.shiftKey) {
            switch (e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    controller.seek(-30, true);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    controller.seek(30, true);
                    break;
                case 'KeyS':
                    e.preventDefault();
                    controller.captureFrame();
                    break;
                case 'KeyP':
                    e.preventDefault();
                    controller.togglePiP();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    controller.toggleFlip();
                    break;
            }
            return;
        }

        // 无任何修饰键（纯单键操作）
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                controller.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                controller.seek(-5, false);
                break;
            case 'ArrowRight':
                e.preventDefault();
                controller.seek(5, false);
                break;
            case 'ArrowUp':
                e.preventDefault();
                controller.changeVolume(0.05);
                break;
            case 'ArrowDown':
                e.preventDefault();
                controller.changeVolume(-0.05);
                break;
            case 'KeyC':
                e.preventDefault();
                controller.setRate(0.1);
                break;
            case 'KeyX':
                e.preventDefault();
                controller.setRate(-0.1);
                break;
            case 'KeyZ':
                e.preventDefault();
                // 循环切换自定义倍速与正常速度 1.0x
                controller.toggleRate();
                break;
            case 'KeyD':
                e.preventDefault();
                controller.prevFrame();
                break;
            case 'KeyF':
                e.preventDefault();
                controller.nextFrame();
                break;
            case 'KeyM':
                e.preventDefault();
                controller.media.muted = !controller.media.muted;
                controller.changeVolume(0);
                break;
            case 'Enter':
                e.preventDefault();
                controller.toggleFullscreen();
                break;
        }
    }, { capture: true });

})();
