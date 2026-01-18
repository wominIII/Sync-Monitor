(function () {
    const extensionName = "sync_monitor";
    const LS_KEY = "sync_monitor_local_config";
    const defaultSettings = {
        right: 20,
        top: 20,
        isMini: false
    };

    function injectStyles() {
        if (document.getElementById('sync-monitor-css')) return;
        const css = "#sync-monitor-indicator{position:fixed;z-index:2147483647;display:flex;justify-content:center;align-items:center;width:130px;height:36px;border-radius:6px;background:rgba(16,20,30,0.9);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.15);box-shadow:0 4px 15px rgba(0,0,0,0.5);font-family:sans-serif;color:white;user-select:none;overflow:hidden;transition:width 0.4s cubic-bezier(0.68,-0.55,0.27,1.55),height 0.4s cubic-bezier(0.68,-0.55,0.27,1.55),border-radius 0.4s ease,background-color 0.3s,border-color 0.3s,box-shadow 0.3s}#sync-monitor-indicator.mini-mode{width:18px;height:18px;padding:0;border-width:2px;border-radius:50%;background:rgba(16,20,30,0.6)}#sync-monitor-indicator.mini-mode .sync-content-wrapper{opacity:0;pointer-events:none;transform:scale(0.5)}.sync-content-wrapper{display:flex;align-items:center;gap:8px;white-space:nowrap;transition:opacity 0.2s,transform 0.2s}.sync-status-text{font-size:13px;font-weight:bold}#sync-monitor-indicator.sync-safe{border-color:rgba(0,234,196,0.4)}#sync-monitor-indicator.sync-safe:not(.mini-mode){box-shadow:0 0 10px rgba(0,234,196,0.1)}#sync-monitor-indicator.sync-safe.mini-mode{background:#00EAC4;border-color:#fff;box-shadow:0 0 10px #00EAC4,0 0 20px rgba(0,234,196,0.4);animation:mini-breathe 3s infinite ease-in-out}#sync-monitor-indicator.sync-safe .sync-status-text,#sync-monitor-indicator.sync-safe i{color:#00EAC4}#sync-monitor-indicator.sync-busy{background:rgba(40,20,10,0.95);border-color:rgba(255,159,67,0.8)}#sync-monitor-indicator.sync-busy.mini-mode{background:#ff9f43;border-color:#fff;box-shadow:0 0 15px #ff9f43,0 0 30px #ff9f43;animation:mini-pulse 0.5s infinite alternate}#sync-monitor-indicator.sync-busy .sync-status-text,#sync-monitor-indicator.sync-busy i{color:#ff9f43}#sync-monitor-indicator.sync-busy:not(.mini-mode)::after{content:'';position:absolute;top:0;left:-150%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,159,67,0.4),transparent);transform:skewX(-20deg);animation:cyber-scan 1.5s infinite linear}@keyframes cyber-scan{0%{left:-150%}100%{left:200%}}@keyframes mini-breathe{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}@keyframes mini-pulse{from{opacity:0.5;transform:scale(0.9)}to{opacity:1;transform:scale(1.3)}}";
        const style = document.createElement('style');
        style.id = 'sync-monitor-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function getSettings() {
        const localData = localStorage.getItem(LS_KEY);
        if (localData) {
            try {
                return Object.assign({}, defaultSettings, JSON.parse(localData));
            } catch (e) {
                console.error(e);
            }
        }
        if (!window.extension_settings) window.extension_settings = {};
        return Object.assign({}, defaultSettings, window.extension_settings[extensionName]);
    }

    function saveSettings(s) {
        localStorage.setItem(LS_KEY, JSON.stringify(s));
        if (!window.extension_settings) window.extension_settings = {};
        window.extension_settings[extensionName] = s;
        if (window.saveSettingsDebounced) window.saveSettingsDebounced();
    }

    function createUI() {
        if (document.getElementById('sync-monitor-indicator')) return true;
        injectStyles();

        const settings = getSettings();
        const div = document.createElement('div');
        div.id = 'sync-monitor-indicator';
        div.className = 'sync-safe';
        div.style.right = (settings.right || 20) + 'px';
        div.style.top = (settings.top || 20) + 'px';
        if (settings.isMini) div.classList.add('mini-mode');

        div.innerHTML = `
            <div class="sync-content-wrapper">
                <i class="fa-solid fa-check" id="sync-icon"></i>
                <span class="sync-status-text" id="sync-text">监控就绪</span>
            </div>
        `;
        document.body.appendChild(div);

        let isActive = false;
        let startX, startY, initialRight, initialTop, startTime;
        let maxMoveDistance = 0;

        function handleStart(clientX, clientY) {
            isActive = true;
            startTime = Date.now();
            startX = clientX;
            startY = clientY;
            maxMoveDistance = 0;

            const style = window.getComputedStyle(div);
            initialRight = parseInt(style.right, 10) || 20;
            initialTop = parseInt(style.top, 10) || 20;

            div.style.transition = 'none';
            if (!('ontouchstart' in window)) {
                div.style.cursor = 'grabbing';
            }
        }

        function handleMove(clientX, clientY) {
            if (!isActive) return;
            const currentDist = Math.sqrt(Math.pow(clientX - startX, 2) + Math.pow(clientY - startY, 2));
            if (currentDist > maxMoveDistance) {
                maxMoveDistance = currentDist;
            }
            const dx = startX - clientX;
            const dy = clientY - startY;
            div.style.right = (initialRight + dx) + 'px';
            div.style.top = (initialTop + dy) + 'px';
        }

        function handleEnd() {
            if (!isActive) return;
            isActive = false;

            div.style.transition = '';
            div.style.cursor = 'default';

            const timeElapsed = Date.now() - startTime;
            const isClick = maxMoveDistance < 10 && timeElapsed < 500;

            if (isClick) {
                toggleMiniMode();
            } else {
                const style = window.getComputedStyle(div);
                const currentSettings = getSettings();
                currentSettings.right = parseInt(style.right, 10);
                currentSettings.top = parseInt(style.top, 10);
                saveSettings(currentSettings);
            }
        }

        div.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            handleStart(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (isActive) {
                e.preventDefault();
                handleMove(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isActive) handleEnd();
        });

        div.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        }, { passive: false });

        div.addEventListener('touchmove', (e) => {
            if (isActive) {
                e.preventDefault();
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
            }
        }, { passive: false });

        div.addEventListener('touchend', () => {
            if (isActive) handleEnd();
        }, { passive: false });

        return true;
    }

    function toggleMiniMode() {
        const div = document.getElementById('sync-monitor-indicator');
        div.classList.toggle('mini-mode');
        const settings = getSettings();
        settings.isMini = div.classList.contains('mini-mode');
        saveSettings(settings);
    }

    function startNetworkHooks() {
        const div = document.getElementById('sync-monitor-indicator');
        let count = 0;
        let timer = null;

        function update() {
            const icon = div.querySelector('#sync-icon');
            const text = div.querySelector('#sync-text');
            if (count > 0) {
                div.classList.remove('sync-safe');
                div.classList.add('sync-busy');
                if (icon) icon.className = 'fa-solid fa-spinner fa-spin';
                if (text) text.innerText = `正在同步 (${count})`;
            } else {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    if (count === 0) {
                        div.classList.remove('sync-busy');
                        div.classList.add('sync-safe');
                        if (icon) icon.className = 'fa-solid fa-check';
                        if (text) text.innerText = '同步完成';
                    }
                }, 500);
            }
        }

        const _fetch = window.fetch;
        window.fetch = async function (...args) {
            const opts = args[1];
            const isMod = opts && ['POST', 'PUT', 'DELETE'].includes(opts.method);
            if (isMod) {
                count++;
                update();
            }
            try {
                return await _fetch(...args);
            } finally {
                if (isMod) {
                    count--;
                    if (count < 0) count = 0;
                    update();
                }
            }
        };

        const _open = XMLHttpRequest.prototype.open;
        const _send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (m, u) {
            this._m = m;
            return _open.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function () {
            const isMod = this._m && ['POST', 'PUT', 'DELETE'].includes(this._m.toUpperCase());
            if (isMod) {
                count++;
                update();
                this.addEventListener('loadend', () => {
                    count--;
                    if (count < 0) count = 0;
                    update();
                });
            }
            return _send.apply(this, arguments);
        };
    }

    const loadInterval = setInterval(() => {
        if (createUI()) {
            clearInterval(loadInterval);
            startNetworkHooks();
        }
    }, 1000);

})();