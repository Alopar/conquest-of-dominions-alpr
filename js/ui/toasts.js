(function(){
    window.UI = window.UI || {};

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
        // Цвета по типам
        let bg = '#1a1a1a';
        let br = '#444';
        if (next.type === 'error') { bg = '#2a1215'; br = '#803033'; }
        else if (next.type === 'success') { bg = '#142914'; br = '#2f6b2f'; }
        else if (next.type === 'copper') { bg = 'linear-gradient(145deg, #2b1a0f, #3a2315)'; br = '#8b5a2b'; }
        else if (next.type === 'silver') { bg = 'linear-gradient(145deg, #1e1f24, #2a2c33)'; br = '#c0c0c0'; }
        else if (next.type === 'gold') { bg = 'linear-gradient(145deg, #2b250f, #3a3112)'; br = '#d4af37'; }
        el.style.background = bg;
        el.style.borderColor = br;
        el.style.color = '#cd853f';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '8px';
        const icon = document.createElement('span');
        let ic = 'ℹ️';
        if (next.type === 'error') ic = '⛔';
        else if (next.type === 'success') ic = '✅';
        else if (next.type === 'copper') ic = '🥉';
        else if (next.type === 'silver') ic = '🥈';
        else if (next.type === 'gold') ic = '🥇';
        icon.textContent = ic;
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
        // Длительность: для «медных/серебряных/золотых» — больше по умолчанию
        const defaultTimeout = (next.type === 'copper' || next.type === 'silver' || next.type === 'gold') ? 5000 : 3000;
        const timeout = Math.max(1000, Number(typeof next.timeout === 'number' ? next.timeout : defaultTimeout));
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

    Object.assign(window.UI, {
        showToast
    });
})();

