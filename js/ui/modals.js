(function(){
    window.UI = window.UI || {};

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

        // Выбираем шаблон
        const type = (opts && opts.type) || 'info';
        const tplId = (function(){
            if (type === 'confirm') return 'tpl-modal-confirm';
            if (type === 'dialog') return 'tpl-modal-dialog';
            if (type === 'reward-pick') return 'tpl-modal-reward-pick';
            return 'tpl-modal-info';
        })();
        const tpl = document.getElementById(tplId);
        const win = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        if (!tpl) {
            win.className = 'modal-window';
            const titleDiv = document.createElement('div');
            titleDiv.className = 'modal-title';
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'modal-body';
            bodyDiv.setAttribute('data-role', 'body');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'modal-actions';
            actionsDiv.setAttribute('data-role', 'actions');
            actionsDiv.style.display = 'none';
            win.appendChild(titleDiv);
            win.appendChild(bodyDiv);
            win.appendChild(actionsDiv);
        }

        // Заголовок
        const titleEl = win.querySelector('.modal-title');
        if (titleEl) {
            const title = (opts && typeof opts.title === 'string') ? opts.title : '';
            titleEl.textContent = title;
            titleEl.style.display = title ? 'block' : 'none';
            if (title) titleEl.setAttribute('data-slot', 'title');
        }
        // Тело
        const bodyEl = win.querySelector('[data-role="body"]') || win;
        if (typeof content === 'string') {
            bodyEl.textContent = content;
        } else if (content instanceof HTMLElement) {
            bodyEl.appendChild(content);
        }

        // Кнопки
        const actionsEl = win.querySelector('[data-role="actions"]');
        if (type === 'info') {
            if (actionsEl) actionsEl.style.display = 'none';
        } else if (type === 'confirm') {
            const okBtn = win.querySelector('[data-action="ok"]');
            if (okBtn) okBtn.addEventListener('click', function(){ close(true); });
        } else if (type === 'dialog' || type === 'reward-pick') {
            const yesBtn = win.querySelector('[data-action="yes"]');
            const noBtn = win.querySelector('[data-action="no"]');
            if (yesBtn && opts && typeof opts.yesText === 'string') yesBtn.textContent = opts.yesText;
            if (noBtn && opts && typeof opts.noText === 'string') noBtn.textContent = opts.noText;
            if (yesBtn) {
                if (opts && typeof opts.yesDisabled === 'boolean') {
                    try { yesBtn.disabled = !!opts.yesDisabled; } catch {}
                }
                yesBtn.addEventListener('click', function(){ if (yesBtn.disabled) return; close(true); });
            }
            if (noBtn) noBtn.addEventListener('click', function(){ close(false); });
        }

        wrap.appendChild(win);

        const prevActive = document.activeElement;

        function onKeydown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (type === 'info') { close(); return; }
                if (type === 'confirm' || type === 'dialog' || type === 'reward-pick') { close(false); return; }
            }
            if (e.key === 'Enter') {
                if (type === 'info') { e.preventDefault(); close(); return; }
                if (type === 'confirm' || type === 'dialog' || type === 'reward-pick') {
                    const preferred = win.querySelector('[data-action="ok"],[data-action="yes"]');
                    if (preferred) { e.preventDefault(); preferred.click(); return; }
                }
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
            if (e.target === wrap) {
                if (type === 'info') close();
                // confirm/dialog не закрываем кликом снаружи
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
            if ((type === 'confirm' || type === 'dialog') && result && opts && typeof opts.onAccept === 'function') {
                try { opts.onAccept(); } catch {}
            }
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

    function alertModal(message, title) {
        const body = document.createElement('div');
        body.textContent = message;
        const h = showModal(body, { type: 'info', title: title || '' });
        return h.closed;
    }

    function confirmModal(message, title, onAccept) {
        const body = document.createElement('div');
        body.textContent = message;
        const h = showModal(body, { type: 'confirm', title: title || '', onAccept });
        return h.closed;
    }

    function closeTopModal() {
        try {
            const top = modalStack[modalStack.length - 1];
            if (top && typeof top.close === 'function') top.close();
        } catch {}
    }

    Object.assign(window.UI, {
        showModal,
        alert: alertModal,
        confirm: confirmModal,
        closeTopModal
    });
})();

