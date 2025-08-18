// Static Data Layer — единая точка доступа к базовым конфигам и пользовательским переопределениям

(function(){
    const CONFIG_DEFS = [
        { id: 'monsters', title: 'Монстры', assets: ['assets/configs/monsters_config.json'], validatorName: 'validateMonstersConfig' },
        { id: 'adventure', title: 'Приключение', assets: ['assets/configs/adventure_config.json'], validatorName: 'validateAdventureConfig' },
        // Порядок: сначала старое имя, затем новое — чтобы избежать 404 до миграции
        { id: 'battleSetup', title: 'Сетап боя', assets: ['assets/configs/battle_config.json', 'assets/configs/battle_setup.json'], validatorName: 'validateBattleConfig' }
    ];

    const LS_PREFS_KEY = 'configPrefs';
    const USER_KEY_PREFIX = 'userConfig:';

    const baseConfigs = {};     // Базовые ассеты
    const userConfigs = {};     // Пользовательские JSON из LocalStorage
    let configPrefs = {};       // { [id]: { useUser: boolean } }

    function getDef(id){ return CONFIG_DEFS.find(d => d.id === id); }
    function getUserKey(id){ return USER_KEY_PREFIX + id; }

    function readPrefs(){
        try { const raw = localStorage.getItem(LS_PREFS_KEY); if (raw) configPrefs = JSON.parse(raw) || {}; } catch {}
        if (!configPrefs || typeof configPrefs !== 'object') configPrefs = {};
        for (const d of CONFIG_DEFS) { if (!configPrefs[d.id]) configPrefs[d.id] = { useUser: false }; }
    }

    function writePrefs(){
        try { localStorage.setItem(LS_PREFS_KEY, JSON.stringify(configPrefs)); } catch {}
    }

    async function fetchJson(url){
        const res = await fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
        return await res.json();
    }

    async function loadBaseConfig(id){
        const def = getDef(id);
        if (!def) throw new Error('Unknown config id: ' + id);
        let lastErr = null;
        for (const url of def.assets){
            try {
                const json = await fetchJson(url);
                validate(id, json);
                baseConfigs[id] = json;
                return;
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr || new Error('Failed to load base config for ' + id);
    }

    function validate(id, json){
        const def = getDef(id);
        const validatorFn = def && def.validatorName && window[def.validatorName];
        if (typeof validatorFn === 'function') {
            validatorFn(json);
        }
    }

    function loadUserConfig(id){
        try {
            const raw = localStorage.getItem(getUserKey(id));
            if (!raw) { userConfigs[id] = undefined; return; }
            const parsed = JSON.parse(raw);
            validate(id, parsed);
            userConfigs[id] = parsed;
        } catch { userConfigs[id] = undefined; }
    }

    function getActive(id){
        const useUser = !!(configPrefs[id] && configPrefs[id].useUser);
        if (useUser && userConfigs[id]) return userConfigs[id];
        return baseConfigs[id];
    }

    async function init(){
        readPrefs();
        for (const def of CONFIG_DEFS){
            await loadBaseConfig(def.id);
            loadUserConfig(def.id);
        }
    }

    function getConfigList(){
        return CONFIG_DEFS.map(d => {
            const hasUser = !!userConfigs[d.id];
            const useUser = !!(configPrefs[d.id] && configPrefs[d.id].useUser);
            return { id: d.id, title: d.title, hasUser, useUser };
        });
    }

    function getConfig(id){
        return getActive(id);
    }

    function setUseUser(id, value){
        if (!configPrefs[id]) configPrefs[id] = { useUser: false };
        configPrefs[id].useUser = !!value;
        writePrefs();
    }

    function setUserConfig(id, json){
        validate(id, json);
        try { localStorage.setItem(getUserKey(id), JSON.stringify(json)); } catch {}
        userConfigs[id] = json;
        setUseUser(id, true);
    }

    async function refresh(){
        for (const def of CONFIG_DEFS){ await loadBaseConfig(def.id); }
        for (const def of CONFIG_DEFS){ loadUserConfig(def.id); }
    }

    window.StaticData = {
        init,
        getConfigList,
        getConfig,
        setUserConfig,
        setUseUser,
        refresh
    };
})();


