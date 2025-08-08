// Конфигурация приложения
let battleConfig = null;
let configLoaded = false;

// Делаем переменные доступными глобально
window.battleConfig = battleConfig;
window.configLoaded = configLoaded;

// Загрузка и парсинг конфигурации
function loadConfigFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            
            // Проверяем структуру конфигурации
            if (!config.unitTypes || !config.armies || !config.armies.attackers || !config.armies.defenders) {
                throw new Error('Неверная структура файла конфигурации');
            }
            
            battleConfig = config;
            configLoaded = true;
            
            // Обновляем глобальные переменные
            window.battleConfig = battleConfig;
            window.configLoaded = configLoaded;
            
            // Обновляем интерфейс
            const statusDiv = document.getElementById('file-status');
            const description = config.battleConfig.description ? ` - ${config.battleConfig.description}` : '';
            statusDiv.textContent = `✅ Загружена конфигурация: "${config.battleConfig.name}"${description}`;
            statusDiv.className = 'file-status success';
            
            // Активируем кнопку боя
            const battleBtn = document.getElementById('battle-btn');
            battleBtn.disabled = false;
            
        } catch (error) {
            console.error('Ошибка при загрузке конфигурации:', error);
            
            const statusDiv = document.getElementById('file-status');
            statusDiv.textContent = `❌ Ошибка загрузки: ${error.message}`;
            statusDiv.className = 'file-status error';
            
            battleConfig = null;
            configLoaded = false;
            
            // Обновляем глобальные переменные
            window.battleConfig = battleConfig;
            window.configLoaded = configLoaded;
            
            // Деактивируем кнопку боя
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
        const response = await fetch('assets/configs/battle_config.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        
        // Проверяем структуру конфигурации
        if (!config.unitTypes || !config.armies || !config.armies.attackers || !config.armies.defenders) {
            throw new Error('Неверная структура файла конфигурации');
        }
        
        battleConfig = config;
        configLoaded = true;
        
        // Обновляем глобальные переменные
        window.battleConfig = battleConfig;
        window.configLoaded = configLoaded;
        
        // Обновляем интерфейс
        const statusDiv = document.getElementById('file-status');
        const description = config.battleConfig.description ? ` - ${config.battleConfig.description}` : '';
        statusDiv.textContent = `✅ Загружена конфигурация: "${config.battleConfig.name}"${description}`;
        statusDiv.className = 'file-status success';
        
        // Активируем кнопку боя
        const battleBtn = document.getElementById('battle-btn');
        battleBtn.disabled = false;
        
    } catch (error) {
        console.error('Ошибка при загрузке стандартной конфигурации:', error);
        
        const statusDiv = document.getElementById('file-status');
        statusDiv.textContent = `❌ Ошибка загрузки стандартной конфигурации: ${error.message}`;
        statusDiv.className = 'file-status error';
        
        battleConfig = null;
        configLoaded = false;
        
        // Обновляем глобальные переменные
        window.battleConfig = battleConfig;
        window.configLoaded = configLoaded;
        
        // Деактивируем кнопку боя
        const battleBtn = document.getElementById('battle-btn');
        battleBtn.disabled = true;
    }
}

// Скачивание образца конфигурации
function downloadSampleConfig() {
    const sampleConfig = {
        "battleConfig": {
            "name": "Образец конфигурации",
            "description": "Пример настройки боя для создания собственной конфигурации",
            "maxUnitsPerArmy": 10,
            "hitThreshold": 11,
            "criticalHit": 20
        },
        "unitTypes": {
            "warrior": {
                "id": "warrior",
                "name": "Воин",
                "hp": 12,
                "damage": "1d6",
                "view": "⚔️"
            },
            "archer": {
                "id": "archer",
                "name": "Лучник",
                "hp": 8,
                "damage": "1d6",
                "view": "🏹"
            }
        },
        "armies": {
            "attackers": {
                "name": "Армия Света",
                "description": "Благородные воины",
                "units": [
                    {"id": "warrior", "count": 3},
                    {"id": "archer", "count": 2}
                ]
            },
            "defenders": {
                "name": "Армия Тьмы",
                "description": "Жестокие монстры",
                "units": [
                    {"id": "warrior", "count": 2},
                    {"id": "archer", "count": 1}
                ]
            }
        },
          "battleSettings": {
    "showDetailedLog": true
  }
    };
    
    const blob = new Blob([JSON.stringify(sampleConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'battle_config_sample.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Делаем функции доступными глобально
window.loadConfigFile = loadConfigFile;
window.loadDefaultConfig = loadDefaultConfig;
window.downloadSampleConfig = downloadSampleConfig;
