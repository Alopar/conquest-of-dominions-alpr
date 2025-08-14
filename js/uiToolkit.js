(function(){
    async function ensureScreenLoaded(id, url) {
        if (document.getElementById(id)) return;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('template').forEach(t => document.body.appendChild(t));
        const el = doc.getElementById(id) || doc.querySelector('.screen');
        if (el) document.body.insertBefore(el, document.body.lastElementChild);
    }

    function ensureMenuBar(screenId, options) {
        try {
            const screen = document.getElementById(screenId);
            if (!screen) return;
            const existing = screen.querySelector('.menu-bar');
            if (existing) existing.remove();
            const mounted = mountTemplate('tpl-menu-bar', screen, {
                slots: { backLabel: (options && options.backLabel) || 'Главная' },
                handlers: { back: (options && options.back) || (window.showIntro || function(){}) }
            });
            if (mounted && mounted.parentElement === screen) {
                try { screen.insertBefore(mounted, screen.firstElementChild || null); } catch {}
            }
            if (mounted && options && options.backId) {
                const btn = mounted.querySelector('[data-action="back"]');
                if (btn) btn.id = options.backId;
            }
        } catch {}
    }

    function mountTemplate(id, container, opts) {
        const tpl = document.getElementById(id);
        if (!tpl || !container) return null;
        const frag = tpl.content.cloneNode(true);
        const slots = (opts && opts.slots) || {};
        const handlers = (opts && opts.handlers) || {};
        Object.keys(slots).forEach(name => {
            frag.querySelectorAll('[data-slot="'+name+'"]').forEach(el => { el.textContent = String(slots[name]); });
        });
        Object.keys(handlers).forEach(name => {
            frag.querySelectorAll('[data-action="'+name+'"]').forEach(el => { el.addEventListener('click', handlers[name]); });
        });
        container.appendChild(frag);
        return container.lastElementChild;
    }

    function cloneTemplate(id) {
        const tpl = document.getElementById(id);
        return tpl ? tpl.content.cloneNode(true) : null;
    }

    function applyTableHead(tableEl, slots) {
        try {
            if (!tableEl) return;
            const tpl = document.getElementById('tpl-unit-table-head');
            if (!tpl) return;
            const frag = tpl.content.cloneNode(true);
            const thead = frag.querySelector('thead');
            if (!thead) return;
            const map = slots || {};
            // Заполняем заданные слоты
            Object.keys(map).forEach(name => {
                thead.querySelectorAll('[data-slot="'+name+'"]').forEach(el => { el.textContent = String(map[name]); });
            });
            // Удаляем неиспользуемые дополнительные колонки (кроме тех, для которых явно передано значение)
            ['extraCol1','extraCol2','extraCol3','extraCol4'].forEach(name => {
                if (!(name in map)) {
                    thead.querySelectorAll('[data-slot="'+name+'"]').forEach(el => el.remove());
                }
            });
            const old = tableEl.querySelector('thead');
            if (old) old.remove();
            tableEl.insertBefore(thead, tableEl.firstChild || null);
        } catch {}
    }

    function mountFileInput(container, options) {
        try {
            if (!container) return null;
            const groupRoot = mountTemplate('tpl-file-input', container, {
                slots: {
                    labelText: (options && options.labelText) || 'Загрузить файл',
                    buttonText: (options && options.buttonText) || '📁 ВЫБРАТЬ ФАЙЛ'
                }
            });
            const input = groupRoot ? groupRoot.querySelector('input[type="file"]') : null;
            const btn = groupRoot ? groupRoot.querySelector('[data-action="open"]') : null;
            const label = groupRoot ? groupRoot.querySelector('.file-label') : null;
            if (groupRoot) container.appendChild(groupRoot);
            if (label && options && options.showLabel === false) {
                label.remove();
            }
            if (input) {
                if (options && options.accept) input.setAttribute('accept', options.accept);
                if (options && options.id) input.id = options.id;
            }
            if (label && input && (options && options.id)) {
                label.setAttribute('for', options.id);
            }
            if (btn && input) {
                btn.addEventListener('click', function(){ input.click(); });
            }
            if (input) {
                input.addEventListener('change', function(){
                    try {
                        if (btn && input.files && input.files[0]) btn.textContent = input.files[0].name;
                        if (options && typeof options.onFile === 'function' && input.files && input.files[0]) {
                            options.onFile(input.files[0]);
                        }
                    } catch {}
                });
            }
            return groupRoot;
        } catch { return null; }
    }

    let modalStack = [];

    function getFocusable(container) {
        return Array.from(container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'))
            .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    }

    function setModalLayerEnabled(enabled) {
        const layer = document.getElementById('modal-layer');
        if (layer) layer.style.pointerEvents = enabled ? 'auto' : 'none';
    }

    function showModal(content, opts) {
        const layer = document.getElementById('modal-layer') || document.body;
        const wrap = document.createElement('div');
        wrap.style.position = 'fixed';
        wrap.style.inset = '0';
        wrap.style.display = 'flex';
        wrap.style.alignItems = 'center';
        wrap.style.justifyContent = 'center';
        wrap.style.background = 'rgba(0,0,0,0.6)';
        wrap.style.pointerEvents = 'auto';
        wrap.style.zIndex = String(900 + modalStack.length);
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.tabIndex = -1;

        const win = document.createElement('div');
        win.style.minWidth = '280px';
        win.style.maxWidth = '90vw';
        win.style.background = '#111';
        win.style.border = '1px solid #444';
        win.style.borderRadius = '8px';
        win.style.padding = '16px';
        win.style.boxShadow = '0 10px 40px rgba(0,0,0,0.7)';

        if (typeof content === 'string') {
            const msg = document.createElement('div');
            msg.style.marginBottom = '16px';
            msg.textContent = content;
            win.appendChild(msg);
        } else if (content instanceof HTMLElement) {
            win.appendChild(content);
        }

        wrap.appendChild(win);

        const prevActive = document.activeElement;

        function onKeydown(e) {
            if (e.key === 'Escape' && (opts ? opts.closeOnEsc !== false : true)) {
                e.preventDefault();
                close();
                return;
            }
            if (e.key === 'Enter') {
                try {
                    const preferred = win.querySelector('[data-default]');
                    const candidate = preferred || win.querySelector('.btn:not(.secondary-btn)') || win.querySelector('button');
                    if (candidate) { e.preventDefault(); candidate.click(); return; }
                } catch {}
            }
            if (e.key === 'Tab') {
                const focusables = getFocusable(wrap);
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        function onClick(e) {
            if (e.target === wrap && (opts ? opts.closeOnOutside !== false : true)) {
                close();
            }
        }

        function close(result) {
            try { wrap.removeEventListener('keydown', onKeydown, true); } catch {}
            try { wrap.removeEventListener('click', onClick, true); } catch {}
            try { layer.removeChild(wrap); } catch {}
            modalStack = modalStack.filter(m => m.wrap !== wrap);
            if (modalStack.length === 0) setModalLayerEnabled(false);
            if (prevActive && typeof prevActive.focus === 'function') {
                try { prevActive.focus(); } catch {}
            }
            if (handle && typeof handle._resolve === 'function') handle._resolve(result);
        }

        wrap.addEventListener('keydown', onKeydown, true);
        wrap.addEventListener('click', onClick, true);
        layer.appendChild(wrap);
        setModalLayerEnabled(true);
        modalStack.push({ wrap, close });
        setTimeout(function(){
            const f = getFocusable(wrap)[0] || win;
            try { f.focus(); } catch {}
        }, 0);

        const handle = { close };
        handle.closed = new Promise(function(resolve){ handle._resolve = resolve; });
        return handle;
    }

    function alertModal(message) {
        return new Promise(function(resolve){
            const content = document.createElement('div');
            const text = document.createElement('div');
            text.style.marginBottom = '16px';
            text.textContent = message;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'flex-end';
            row.style.gap = '12px';
            const ok = document.createElement('button');
            ok.className = 'btn';
            ok.textContent = 'ОК';
            content.appendChild(text);
            row.appendChild(ok);
            content.appendChild(row);
        const h = showModal(content, {});
            ok.addEventListener('click', function(){ h.close(true); });
            h.closed.then(function(){ resolve(); });
        });
    }

    function confirmModal(message) {
        return new Promise(function(resolve){
            const content = document.createElement('div');
            const text = document.createElement('div');
            text.style.marginBottom = '16px';
            text.textContent = message;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'flex-end';
            row.style.gap = '12px';
            const cancel = document.createElement('button');
            cancel.className = 'btn secondary-btn';
            cancel.textContent = 'Отмена';
            const ok = document.createElement('button');
            ok.className = 'btn';
            ok.textContent = 'ОК';
            ok.setAttribute('data-default', '1');
            content.appendChild(text);
            row.appendChild(cancel);
            row.appendChild(ok);
            content.appendChild(row);
            const h = showModal(content, {});
            cancel.addEventListener('click', function(){ h.close(false); });
            ok.addEventListener('click', function(){ h.close(true); });
            h.closed.then(function(res){ resolve(!!res); });
        });
    }

    function closeTopModal() {
        try {
            const top = modalStack[modalStack.length - 1];
            if (top && typeof top.close === 'function') top.close();
        } catch {}
    }

    let toastQueue = [];
    let activeToasts = [];
    const maxActiveToasts = 5;

    function ensureToastContainer() {
        let layer = document.getElementById('toast-layer');
        if (!layer) layer = document.body;
        let cont = layer.querySelector('.toast-container');
        if (!cont) {
            cont = document.createElement('div');
            cont.className = 'toast-container';
            cont.style.position = 'fixed';
            cont.style.top = '16px';
            cont.style.right = '16px';
            cont.style.display = 'flex';
            cont.style.flexDirection = 'column';
            cont.style.gap = '8px';
            cont.style.pointerEvents = 'none';
            layer.appendChild(cont);
        }
        return cont;
    }

    function dequeueToast() {
        if (activeToasts.length >= maxActiveToasts) return;
        const next = toastQueue.shift();
        if (!next) return;
        const cont = ensureToastContainer();
        const el = document.createElement('div');
        el.style.pointerEvents = 'auto';
        el.style.minWidth = '220px';
        el.style.maxWidth = '360px';
        el.style.padding = '10px 12px';
        el.style.borderRadius = '6px';
        el.style.border = '1px solid #444';
        el.style.boxShadow = '0 6px 22px rgba(0,0,0,0.45)';
        el.style.background = next.type === 'error' ? '#2a1215' : (next.type === 'success' ? '#142914' : '#1a1a1a');
        el.style.color = '#cd853f';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '8px';
        const icon = document.createElement('span');
        icon.textContent = next.type === 'error' ? '⛔' : (next.type === 'success' ? '✅' : 'ℹ️');
        const text = document.createElement('div');
        text.textContent = next.message;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn secondary-btn';
        closeBtn.textContent = '✖';
        closeBtn.style.padding = '2px 6px';
        closeBtn.style.marginLeft = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', function(){ removeToast(el); });
        el.appendChild(icon);
        el.appendChild(text);
        el.appendChild(closeBtn);
        cont.appendChild(el);
        activeToasts.push(el);
        const timeout = Math.max(1000, Number(next.timeout || 3000));
        el._timer = setTimeout(function(){ removeToast(el); }, timeout);
    }

    function removeToast(el) {
        if (!el) return;
        try { if (el._timer) clearTimeout(el._timer); } catch {}
        const idx = activeToasts.indexOf(el);
        if (idx >= 0) activeToasts.splice(idx, 1);
        try { el.remove(); } catch {}
        dequeueToast();
    }

    function showToast(type, message, timeout) {
        toastQueue.push({ type, message, timeout });
        dequeueToast();
    }

    function attachTooltip(target, contentOrFn, options) {
        if (!target) return function(){};
        let layer = document.getElementById('tooltip-layer');
        if (!layer) layer = document.body;
        let tipEl = null;
        let showTimer = null;
        let lastPos = { x: 0, y: 0 };
        const delay = (options && typeof options.delay === 'number') ? options.delay : 300;
        const hideDelay = (options && typeof options.hideDelay === 'number') ? options.hideDelay : 100;

        function ensureTip() {
            if (tipEl) return tipEl;
            tipEl = document.createElement('div');
            tipEl.style.position = 'fixed';
            tipEl.style.transform = 'translate(12px, 12px)';
            tipEl.style.background = '#111';
            tipEl.style.border = '1px solid #444';
            tipEl.style.borderRadius = '6px';
            tipEl.style.padding = '8px 10px';
            tipEl.style.maxWidth = '320px';
            tipEl.style.pointerEvents = 'none';
            tipEl.style.zIndex = '1000';
            tipEl.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
            tipEl.style.display = 'none';
            layer.appendChild(tipEl);
            return tipEl;
        }

        function setContent() {
            const tip = ensureTip();
            try {
                const val = (typeof contentOrFn === 'function') ? contentOrFn(target) : contentOrFn;
                tip.textContent = String(val || '');
            } catch { tip.textContent = ''; }
        }

        function position(e) {
            const tip = ensureTip();
            lastPos.x = e.clientX; lastPos.y = e.clientY;
            tip.style.left = lastPos.x + 'px';
            tip.style.top = lastPos.y + 'px';
        }

        function showSoon() {
            if (showTimer) return;
            showTimer = setTimeout(function(){
                showTimer = null;
                const tip = ensureTip();
                setContent();
                tip.style.display = 'block';
                tip.style.left = lastPos.x + 'px';
                tip.style.top = lastPos.y + 'px';
            }, delay);
        }

        let hideTimer = null;
        function hideSoon() {
            if (showTimer) { clearTimeout(showTimer); showTimer = null; }
            if (hideTimer) { clearTimeout(hideTimer); }
            hideTimer = setTimeout(function(){
                const tip = ensureTip();
                tip.style.display = 'none';
            }, hideDelay);
        }

        function onEnter(e) { position(e); showSoon(); }
        function onMove(e) { position(e); }
        function onLeave() { hideSoon(); }

        target.addEventListener('mouseenter', onEnter);
        target.addEventListener('mousemove', onMove);
        target.addEventListener('mouseleave', onLeave);

        return function detach(){
            try { target.removeEventListener('mouseenter', onEnter); } catch {}
            try { target.removeEventListener('mousemove', onMove); } catch {}
            try { target.removeEventListener('mouseleave', onLeave); } catch {}
            if (tipEl) try { tipEl.remove(); } catch {}
        };
    }

    window.UI = { ensureScreenLoaded, ensureMenuBar, mountTemplate, cloneTemplate, applyTableHead, mountFileInput, showModal, confirm: confirmModal, alert: alertModal, showToast, attachTooltip, closeTopModal };
})();
