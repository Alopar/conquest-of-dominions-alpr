// Конфигурация приложения
let battleConfig = null;
let configLoaded = false;

// Делаем переменные доступными глобально
window.battleConfig = battleConfig;
window.configLoaded = configLoaded;

// Загрузка и парсинг конфигурации
async function loadConfigFile(file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const config = JSON.parse(e.target.result);
            if (!config.armies || !config.armies.attackers || !config.armies.defenders) {
                throw new Error('Неверная структура файла конфигурации');
            }
            // Загружаем типы монстров
            const monsters = await window.loadMonstersConfig();
            config.unitTypes = monsters;
            battleConfig = config;
            configLoaded = true;
            window.battleConfig = battleConfig;
            window.configLoaded = configLoaded;
            window.battleConfigSource = 'fight';
            const statusDiv = document.getElementById('file-status');
            const description = config.battleConfig.description ? ` - ${config.battleConfig.description}` : '';
            statusDiv.textContent = `✅ Загружена конфигурация: "${config.battleConfig.name}"${description}`;
            statusDiv.className = 'file-status success';
            const battleBtn = document.getElementById('battle-btn');
            battleBtn.disabled = false;
        } catch (error) {
            console.error('Ошибка при загрузке конфигурации:', error);
            const statusDiv = document.getElementById('file-status');
            statusDiv.textContent = `❌ Ошибка загрузки: ${error.message}`;
            statusDiv.className = 'file-status error';
            battleConfig = null;
            configLoaded = false;
            window.battleConfig = battleConfig;
            window.configLoaded = configLoaded;
            window.battleConfigSource = undefined;
            const battleBtn = document.getElementById('battle-btn');
            battleBtn.disabled = true;
        }
    };
    reader.onerror = function() {
        const statusDiv = document.getElementById('file-status');
        statusDiv.textContent = '❌ Ошибка чтения файла';
        statusDiv.className = 'file-status error';
    };
    reader.readAsText(file);
}

// Загрузка стандартной конфигурации
async function loadDefaultConfig() {
    try {
        const url = 'assets/configs/battle_config.json?_=' + Date.now();
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        if (!config.armies || !config.armies.attackers || !config.armies.defenders) {
            throw new Error('Неверная структура файла конфигурации');
        }
        const monsters = await window.loadMonstersConfig();
        config.unitTypes = monsters;
        battleConfig = config;
        configLoaded = true;
        window.battleConfig = battleConfig;
        window.configLoaded = configLoaded;
        window.battleConfigSource = 'fight';
        const statusDiv = document.getElementById('file-status');
        const description = config.battleConfig.description ? ` - ${config.battleConfig.description}` : '';
        statusDiv.textContent = `✅ Загружена конфигурация: "${config.battleConfig.name}"${description}`;
        statusDiv.className = 'file-status success';
        const battleBtn = document.getElementById('battle-btn');
        battleBtn.disabled = false;
    } catch (error) {
        console.error('Ошибка при загрузке стандартной конфигурации:', error);
        const statusDiv = document.getElementById('file-status');
        statusDiv.textContent = `❌ Ошибка загрузки стандартной конфигурации: ${error.message}`;
        statusDiv.className = 'file-status error';
        battleConfig = null;
        configLoaded = false;
        window.battleConfig = battleConfig;
        window.configLoaded = configLoaded;
        window.battleConfigSource = undefined;
        const battleBtn = document.getElementById('battle-btn');
        battleBtn.disabled = true;
    }
}

// Скачивание образца конфигурации
async function downloadSampleConfig() {
    try {
        const res = await fetch('assets/configs/samples/battle_config_sample.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'battle_config_sample.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Не удалось скачать образец боя:', e);
    }
}

// Делаем функции доступными глобально
window.loadConfigFile = loadConfigFile;
window.loadDefaultConfig = loadDefaultConfig;
window.downloadSampleConfig = downloadSampleConfig;
