// Кэш текущего бестиария (unitTypes)
let _monstersCache = null;

function setMonstersConfig(rawConfig) {
    if (!rawConfig || typeof rawConfig !== 'object') return;
    _monstersCache = rawConfig.unitTypes || rawConfig;
}

// Загрузка типов монстров из StaticData
async function loadMonstersConfig() {
    if (_monstersCache) return _monstersCache;
    
    if (window.StaticData && typeof window.StaticData.getConfig === 'function') {
        const cfg = window.StaticData.getConfig('monsters');
        if (cfg) {
            setMonstersConfig(cfg);
        }
    }
    return _monstersCache || {};
}

function getMonstersConfigCached() { return _monstersCache; }

window.loadMonstersConfig = loadMonstersConfig;
window.setMonstersConfig = setMonstersConfig;
window.getMonstersConfigCached = getMonstersConfigCached;
