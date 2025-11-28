(function(){
    window.UI = window.UI || {};

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
            if (tipEl && tipEl.isConnected && tipEl.parentElement === layer) return tipEl;
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
                while (tip.firstChild) tip.removeChild(tip.firstChild);
                if (val instanceof HTMLElement) {
                    tip.appendChild(val);
                } else if (typeof val === 'string') {
                    tip.textContent = val;
                } else if (val != null) {
                    tip.textContent = String(val);
                } else {
                    tip.textContent = '';
                }
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
                try { clearTooltips(); } catch {}
                tipEl = null;
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

    function clearTooltips() {
        try {
            let layer = document.getElementById('tooltip-layer');
            if (!layer) return;
            while (layer.firstChild) { layer.removeChild(layer.firstChild); }
        } catch {}
    }

    Object.assign(window.UI, {
        attachTooltip,
        clearTooltips
    });
})();

