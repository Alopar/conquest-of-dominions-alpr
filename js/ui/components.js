(function(){
    window.UI = window.UI || {};

    async function ensureScreenLoaded(id, url) {
        if (document.getElementById(id)) return;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('template').forEach(function(t){ document.body.appendChild(t); });
        const el = doc.getElementById(id) || doc.querySelector('.screen');
        if (el) {
            const screenLayer = document.getElementById('screen-layer') || document.body;
            screenLayer.appendChild(el);
        }
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

    /**
     * Создает DOM-элемент из шаблона, заполняя слоты.
     * @param {string} id - ID шаблона
     * @param {Object} [opts] - Опции { slots: {}, handlers: {} }
     * @returns {HTMLElement|null}
     */
    function renderTemplate(id, opts) {
        const tpl = document.getElementById(id);
        if (!tpl) {
            console.warn(`Template not found: ${id}`);
            return document.createElement('div');
        }
        
        // Клонируем содержимое
        const frag = tpl.content.cloneNode(true);
        const root = frag.firstElementChild;
        if (!root) return null;

        const slots = (opts && opts.slots) || {};
        const handlers = (opts && opts.handlers) || {};

        // Заполняем текстовые слоты: data-slot="name"
        Object.keys(slots).forEach(name => {
            const value = String(slots[name]);
            // Ищем внутри корневого элемента
            const slotEl = root.querySelector(`[data-slot="${name}"]`);
            if (slotEl) {
                slotEl.textContent = value;
            } else if (root.dataset.slot === name) {
                // Если сам корень является слотом
                root.textContent = value;
            }
        });

        // Навешиваем обработчики: data-action="name"
        Object.keys(handlers).forEach(name => {
            const handler = handlers[name];
            root.querySelectorAll(`[data-action="${name}"]`).forEach(el => { 
                el.addEventListener('click', handler); 
            });
            if (root.dataset.action === name) {
                root.addEventListener('click', handler);
            }
        });

        return root;
    }

    function mountTemplate(id, container, opts) {
        if (!container) return null;
        const el = renderTemplate(id, opts);
        if (el) {
            container.appendChild(el);
        }
        return el;
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
            // groupRoot уже добавлен через mountTemplate
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
                        if (!options || options.keepButtonText !== true) {
                            if (btn && input.files && input.files[0]) btn.textContent = input.files[0].name;
                        }
                        if (options && typeof options.onFile === 'function' && input.files && input.files[0]) {
                            options.onFile(input.files[0]);
                        }
                    } catch {}
                });
            }
            return groupRoot;
        } catch { return null; }
    }

    function mountConfigPanel(container, options) {
        if (!container) return null;
        const panel = mountTemplate('tpl-config-panel', container, { slots: { title: (options && options.title) || '⚙️ Конфигурация' } });
        if (!panel) return null;
        const status = panel.querySelector('[data-role="status"]');
        const fileSlot = panel.querySelector('[data-role="file-slot"]');
        const sampleBtnWrap = panel.querySelector('[data-role="sample-slot"]');
        const primaryRow = panel.querySelector('[data-role="primary-row"]');
        
        if (status && options && options.statusId) { try { status.id = options.statusId; } catch {} }
        if (status && options && typeof options.getStatusText === 'function') {
            try { status.textContent = String(options.getStatusText()); } catch {}
        }
        if (fileSlot && (options && options.fileInput !== false)) {
            mountFileInput(fileSlot, {
                labelText: (options && typeof options.fileLabelText === 'string') ? options.fileLabelText : 'Загрузить файл',
                buttonText: (options && options.fileButtonText) || '📁 ЗАГРУЗИТЬ',
                accept: (options && options.accept) || '.json,application/json',
                id: (options && options.inputId) || undefined,
                onFile: (options && typeof options.onFile === 'function') ? options.onFile : undefined,
                keepButtonText: true,
                showLabel: !!(options && options.fileLabelText)
            });
        } else if (fileSlot) { fileSlot.remove(); }

        if (sampleBtnWrap) {
            if (options && typeof options.onSample === 'function') sampleBtnWrap.querySelector('[data-action="sample"]').addEventListener('click', options.onSample);
            else sampleBtnWrap.remove();
        }

        if (primaryRow) { primaryRow.remove(); }

        return panel;
    }

    Object.assign(window.UI, {
        ensureScreenLoaded,
        ensureMenuBar,
        renderTemplate,
        mountTemplate,
        cloneTemplate,
        applyTableHead,
        mountFileInput,
        mountConfigPanel
    });
})();
