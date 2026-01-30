// Гарантируем регистрацию функций для глобального доступа
window.showBestiary = showBestiary;
window.backToIntroFromBestiary = backToIntroFromBestiary;

// Экран бестиария для просмотра и управления типами монстров
let bestiaryMonsters = {};

// Показать экран бестиария
async function showBestiary() {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('bestiary');
            // Router -> LobbySpace -> _onScreenShown -> refreshBestiaryList (loadAndRenderBestiary)
            return;
        }
        
        if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('bestiary-screen', 'fragments/bestiary.html');
            if (window.UI.ensureMenuBar) {
                window.UI.ensureMenuBar('bestiary-screen', { 
                    backLabel: 'Главная', 
                    back: window.backToIntroFromBestiary 
                });
            }
        }
    } catch (e) {
        console.error('[Bestiary] Error showing screen:', e);
    }
    
    if (typeof window.showScreen === 'function') {
        window.showScreen('bestiary-screen');
    }
    
    loadAndRenderBestiary();
}

// Вернуться на главный экран
function backToIntroFromBestiary() {
    if (typeof window.showIntro === 'function') return window.showIntro();
}

// Загрузить monsters_config.json и отобразить
async function loadAndRenderBestiary() {
    try {
        let cfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('monsters') : null;
        
        // Если конфиг еще не загружен, попробуем подождать или загрузить напрямую
        if (!cfg && window.StaticData && typeof window.StaticData.init === 'function') {
            await window.StaticData.init();
            cfg = window.StaticData.getConfig('monsters');
        }

        bestiaryMonsters = cfg && typeof cfg === 'object' ? (cfg.unitTypes || cfg) : {};
        renderBestiaryTable();
    } catch (e) {
        console.error('[Bestiary] loadAndRenderBestiary error:', e);
        const table = document.getElementById('bestiary-table');
        if (table) table.innerHTML = '<tr><td colspan="7">Ошибка загрузки конфига монстров</td></tr>';
    }
}

// Отрисовать таблицу монстров
function renderBestiaryTable() {
    const table = document.getElementById('bestiary-table');
    if (!table) {
        console.warn('[Bestiary] table element not found');
        return;
    }
    table.innerHTML = '';
    const monsterIds = Object.keys(bestiaryMonsters);
    if (monsterIds.length === 0) {
        table.innerHTML = '<tr><td colspan="7">Список монстров пуст</td></tr>';
        return;
    }
    for (let i = 0; i < monsterIds.length; i++) {
        const id = monsterIds[i];
        const m = bestiaryMonsters[id];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="icon-cell">${m.view || '❓'}</td>
            <td>${m.name || 'Без имени'}</td>
            <td>${m.id || id}</td>
            <td>${m.type || ''}</td>
            <td>${m.hp || 0}</td>
            <td>${m.damage || 0}</td>
            <td>${Number(m.targets || 1)}</td>
        `;
        table.appendChild(row);
    }
}

// Алиас для вызова из LobbySpace
window.refreshBestiaryList = loadAndRenderBestiary;

window.showBestiary = showBestiary;
window.backToIntroFromBestiary = backToIntroFromBestiary;
