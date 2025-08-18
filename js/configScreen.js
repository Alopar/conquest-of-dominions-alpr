(function(){
    async function showConfig() {
        // Всегда гарантируем наличие DOM узла экрана
        try {
            if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
                await window.UI.ensureScreenLoaded('config-screen', 'fragments/config.html');
            } else {
                let el = document.getElementById('config-screen');
                if (!el) {
                    try {
                        const res = await fetch('fragments/config.html', { cache: 'no-store' });
                        if (res.ok) {
                            const html = await res.text();
                            const doc = new DOMParser().parseFromString(html, 'text/html');
                            el = doc.getElementById('config-screen') || doc.querySelector('.screen');
                            const screenLayer = document.getElementById('screen-layer') || document.body;
                            if (el && screenLayer) screenLayer.appendChild(el);
                        }
                    } catch {}
                }
            }
        } catch {}

        // Теперь переключаемся на экран (обходим Router, т.к. он может не знать о 'config')
        try { window.showScreen('config-screen'); } catch { }

        // Гарантируем активность
        try {
            const el = document.getElementById('config-screen');
            if (el && !el.classList.contains('active')) {
                window.showScreen('config-screen');
            }
        } catch {}

        try {
            const host = document.getElementById('config-table-host');
            const btn = document.getElementById('config-refresh-btn');
            if (btn) {
                btn.onclick = async function(){
                    try {
                        if (window.StaticData && typeof window.StaticData.refresh === 'function') await window.StaticData.refresh();
                        if (window.eventBus && typeof window.eventBus.emit === 'function') window.eventBus.emit('configs:refreshed');
                        renderConfigTable();
                        try { if (window.UI && typeof window.UI.showToast === 'function') window.UI.showToast('success', 'Конфигурации обновлены'); } catch {}
                    } catch {}
                };
            }
            if (host) {
                renderConfigTable();
            }
        } catch {}
    }

    function renderConfigTable(){
        const host = document.getElementById('config-table-host');
        if (!host) return;
        try {
            const list = (window.StaticData && typeof window.StaticData.getConfigList === 'function') ? window.StaticData.getConfigList() : [];
            const table = document.createElement('table');
            table.className = 'bestiary-table unit-info-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Есть пользовательский</th>
                        <th>Использовать пользовательский</th>
                        <th></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            if (list.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="6">Нет данных</td>';
                tbody.appendChild(tr);
            } else {
                for (const it of list) {
                    const tr = document.createElement('tr');
                    const hasUser = !!it.hasUser;
                    const useUser = !!it.useUser;
                    tr.innerHTML = `
                        <td>${it.id}</td>
                        <td>${it.title}</td>
                        <td style="text-align:center;">${hasUser ? '✅' : '—'}</td>
                        <td style="text-align:center;"><input type="checkbox" class="cfg-useUser" data-id="${it.id}" ${useUser ? 'checked' : ''} /></td>
                        <td><button class="btn" data-action="loadBase" data-id="${it.id}">Загрузить</button></td>
                        <td><button class="btn" data-action="download" data-id="${it.id}">Скачать</button></td>
                    `;
                    tbody.appendChild(tr);
                }
            }
            host.innerHTML = '';
            host.appendChild(table);
            attachHandlers(table);
        } catch {
            host.innerHTML = '<div>Не удалось отобразить таблицу</div>';
        }
    }

    function attachHandlers(root){
        if (!root) return;
        root.querySelectorAll('input.cfg-useUser').forEach(cb => {
            cb.addEventListener('change', function(){
                const id = this.getAttribute('data-id');
                const val = !!this.checked;
                try { if (window.StaticData) window.StaticData.setUseUser(id, val); } catch {}
                renderConfigTable();
            });
        });
        root.querySelectorAll('button[data-action="loadBase"]').forEach(btn => {
            btn.addEventListener('click', async function(){
                const id = this.getAttribute('data-id');
                try {
                    if (window.StaticData) window.StaticData.setUseUser(id, false);
                    if (window.StaticData && typeof window.StaticData.refresh === 'function') await window.StaticData.refresh();
                    if (window.eventBus && typeof window.eventBus.emit === 'function') window.eventBus.emit('configs:refreshed');
                    try { if (window.UI && typeof window.UI.showToast === 'function') window.UI.showToast('success', 'Базовый конфиг применён'); } catch {}
                } catch {}
                renderConfigTable();
            });
        });
        root.querySelectorAll('button[data-action="download"]').forEach(btn => {
            btn.addEventListener('click', function(){
                const id = this.getAttribute('data-id');
                try {
                    const json = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig(id) : null;
                    if (!json) return;
                    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    const href = URL.createObjectURL(blob);
                    a.href = href; a.download = `${id}.json`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(href);
                } catch {}
            });
        });
    }

    window.showConfig = showConfig;
})();


