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
        } else if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('bestiary-screen', 'fragments/bestiary.html');
            if (window.UI.ensureMenuBar) window.UI.ensureMenuBar('bestiary-screen', { backLabel: 'Главная', back: window.backToIntroFromBestiary });
        }
    } catch {}
    if (typeof window.showScreen === 'function') window.showScreen('bestiary-screen');
    try {
        if (window.StaticData && typeof window.StaticData.getConfig === 'function') {
            const cfg = window.StaticData.getConfig('monsters');
            bestiaryMonsters = cfg && typeof cfg === 'object' ? (cfg.unitTypes || cfg) : {};
        }
    } catch {}
    loadAndRenderBestiary();
}

// Вернуться на главный экран
function backToIntroFromBestiary() {
    if (typeof window.showIntro === 'function') return window.showIntro();
}

// Загрузить monsters_config.json и отобразить
async function loadAndRenderBestiary() {
    try {
        const cfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('monsters') : null;
        bestiaryMonsters = cfg && typeof cfg === 'object' ? (cfg.unitTypes || cfg) : {};
        renderBestiaryTable();
    } catch (e) {
        const table = document.getElementById('bestiary-table');
        if (table) table.innerHTML = '<tr><td colspan="7">Ошибка загрузки конфига монстров</td></tr>';
    }
}

// Отрисовать таблицу монстров
function renderBestiaryTable() {
    const table = document.getElementById('bestiary-table');
    if (!table) return;
    table.innerHTML = '';
    const monsterIds = Object.keys(bestiaryMonsters);
    for (let i = 0; i < monsterIds.length; i++) {
        const id = monsterIds[i];
        const m = bestiaryMonsters[id];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="icon-cell">${m.view || '❓'}</td>
            <td>${m.name}</td>
            <td>${m.id}</td>
            <td>${m.type || ''}</td>
            <td>${m.hp}</td>
            <td>${m.damage}</td>
            <td>${Number(m.targets || 1)}</td>
        `;
        table.appendChild(row);
    }
}

window.showBestiary = showBestiary;
window.backToIntroFromBestiary = backToIntroFromBestiary;
