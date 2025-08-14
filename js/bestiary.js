// Гарантируем регистрацию функций для глобального доступа
window.showBestiary = showBestiary;
window.backToIntroFromBestiary = backToIntroFromBestiary;
window.uploadMonstersConfigFile = uploadMonstersConfigFile;
window.downloadMonstersConfig = downloadMonstersConfig;
// Экран бестиария для просмотра и управления типами монстров

let bestiaryMonsters = {};

// Показать экран бестиария
async function showBestiary() {
    try {
        if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('bestiary-screen', 'fragments/bestiary.html');
            if (window.UI.ensureMenuBar) window.UI.ensureMenuBar('bestiary-screen', { backLabel: 'Главная', back: window.backToIntroFromBestiary });
            try {
                const table = document.querySelector('#bestiary-screen table');
                if (window.UI.applyTableHead) window.UI.applyTableHead(table, { extraCol1: 'Тип', extraCol2: '❤️ HP', extraCol3: '💥 Урон', extraCol4: '🎯 Цели' });
            } catch {}
            try {
                const btnRow = document.querySelector('#bestiary-screen .bestiary-actions');
                if (btnRow) btnRow.innerHTML = '';
                if (window.UI.mountFileInput && btnRow) window.UI.mountFileInput(btnRow, {
                    id: 'monsters-file',
                    accept: '.json',
                    labelText: 'Файл конфигурации монстров:',
                    showLabel: false,
                    buttonText: '📁 ВЫБРАТЬ ФАЙЛ',
                    onFile: function(file){ if (window.uploadMonstersConfigFile) window.uploadMonstersConfigFile({ files:[file] }); }
                });
                if (btnRow) {
                    const dlBtn = document.createElement('button');
                    dlBtn.className = 'btn secondary-btn';
                    dlBtn.textContent = '💾 Скачать конфиг';
                    dlBtn.addEventListener('click', function(){ if (window.downloadMonstersConfig) window.downloadMonstersConfig(); });
                    btnRow.appendChild(dlBtn);
                }
            } catch {}
        }
    } catch {}
    if (typeof window.showScreen === 'function') window.showScreen('bestiary-screen');
    loadAndRenderBestiary();
}

// Вернуться на главный экран
function backToIntroFromBestiary() {
    if (typeof window.showIntro === 'function') return window.showIntro();
}

// Загрузить monsters_config.json и отобразить
async function loadAndRenderBestiary() {
    try {
        bestiaryMonsters = await window.loadMonstersConfig();
        renderBestiaryTable();
    } catch (e) {
        document.getElementById('bestiary-table').innerHTML = '<tr><td colspan="7">Ошибка загрузки конфига монстров</td></tr>';
    }
}

// Отрисовать таблицу монстров
function renderBestiaryTable() {
    const table = document.getElementById('bestiary-table');
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

// Загрузить monsters_config.json с диска
function uploadMonstersConfigFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            // Простая валидация
            if (typeof config !== 'object' || Array.isArray(config)) throw new Error();
            bestiaryMonsters = config;
            // Сохраняем в localStorage (опционально)
            localStorage.setItem('monsters_config', JSON.stringify(config));
            renderBestiaryTable();
        } catch {
            alert('Ошибка: некорректный файл конфигурации монстров!');
        }
    };
    reader.readAsText(file);
}

// Скачать текущий monsters_config.json
function downloadMonstersConfig() {
    const blob = new Blob([JSON.stringify(bestiaryMonsters, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monsters_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.showBestiary = showBestiary;
window.backToIntroFromBestiary = backToIntroFromBestiary;
window.uploadMonstersConfigFile = uploadMonstersConfigFile;
window.downloadMonstersConfig = downloadMonstersConfig;
