// StaticData Layer — единая точка доступа к базовым конфигам.
// Пользовательские конфигурации (загрузка/редактирование) удалены.

(function(){
    const CONFIG_DEFS = [
        { id: 'monsters', title: 'Монстры', assets: ['assets/configs/units/monsters_config.json'], validatorName: 'validateMonstersConfig' },
        { id: 'adventure', title: 'Приключение', assets: ['assets/configs/adventure/adventure_config.json'], validatorName: 'validateAdventureConfig' },
        { id: 'pathSchemes', title: 'Схемы путей', assets: ['assets/configs/adventure/path_schemes.json'], validatorName: 'validatePathSchemesConfig' },
        { id: 'encounters', title: 'Встречи', assets: ['assets/configs/adventure/encounters_config.json'], validatorName: 'validateEncountersConfig' },
        { id: 'events', title: 'События', assets: ['assets/configs/adventure/events_config.json'] },
        { id: 'raids', title: 'Рейды', assets: ['assets/configs/adventure/raids_config.json'] },
        { id: 'rewards', title: 'Награды', assets: ['assets/configs/adventure/rewards_config.json'], validatorName: 'validateRewardsConfig' },
        { id: 'currencies', title: 'Валюты', assets: ['assets/configs/game/currencies_config.json'], validatorName: 'validateCurrenciesConfig' },
        { id: 'mercenaries', title: 'Наёмники', assets: ['assets/configs/units/mercenaries_config.json'], validatorName: 'validateMercenariesConfig' },
        { id: 'heroClasses', title: 'Классы героев', assets: ['assets/configs/hero/hero_classes.json'], validatorName: 'validateHeroClassesConfig' },
        { id: 'heroUpgrades', title: 'Улучшения героя', assets: ['assets/configs/hero/hero_upgrades.json'], validatorName: 'validateHeroUpgradesConfig' },
        { id: 'perks', title: 'Перки', assets: ['assets/configs/hero/perks_config.json'], validatorName: 'validatePerksConfig' },
        { id: 'developmentTracks', title: 'Треки развития', assets: ['assets/configs/hero/hero_upgrade_tracks.json'], validatorName: 'validateDevelopmentTracksConfig' },
        { id: 'achievements', title: 'Достижения', assets: ['assets/configs/game/achievements_config.json'], validatorName: 'validateAchievementsConfig' },
        // Основной файл сетапа боя
        { id: 'battleSetup', title: 'Сетап боя', assets: ['assets/configs/game/battle_setup.json'], validatorName: 'validateBattleConfig' }
    ];

    const baseConfigs = {};     // Базовые ассеты

    function getDef(id){ return CONFIG_DEFS.find(d => d.id === id); }

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

    // Теперь всегда возвращает базовый конфиг
    function getActive(id){
        return baseConfigs[id];
    }

    async function init(){
        for (const def of CONFIG_DEFS){
            await loadBaseConfig(def.id);
        }
    }

    // Упрощенная версия для совместимости, возвращает просто список
    function getConfigList(){
        return CONFIG_DEFS.map(d => {
            return { id: d.id, title: d.title, hasUser: false, useUser: false };
        });
    }

    function getConfig(id){
        return getActive(id);
    }

    async function refresh(){
        for (const def of CONFIG_DEFS){ await loadBaseConfig(def.id); }
    }

    // Заглушки для совместимости (если где-то еще вызываются)
    function setUserConfig(id, json) { console.warn('setUserConfig is deprecated'); }
    function setUseUser(id, value) { console.warn('setUseUser is deprecated'); }
    function clearAllUser() { console.warn('clearAllUser is deprecated'); }

    window.StaticData = {
        init,
        getConfigList,
        getConfig,
        setUserConfig,
        setUseUser,
        refresh,
        clearAllUser
    };
})();
