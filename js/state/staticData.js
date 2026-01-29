// StaticData Layer — единая точка доступа к игровым конфигурациям.
(function(){
    const CONFIG_DEFS = [
        { id: 'monsters', url: 'assets/configs/units/monsters_config.json' },
        { id: 'adventure', url: 'assets/configs/adventure/adventure_config.json' },
        { id: 'pathSchemes', url: 'assets/configs/adventure/path_schemes.json' },
        { id: 'encounters', url: 'assets/configs/adventure/encounters_config.json' },
        { id: 'events', url: 'assets/configs/adventure/events_config.json' },
        { id: 'raids', url: 'assets/configs/adventure/raids_config.json' },
        { id: 'rewards', url: 'assets/configs/adventure/rewards_config.json' },
        { id: 'currencies', url: 'assets/configs/game/currencies_config.json' },
        { id: 'mercenaries', url: 'assets/configs/units/mercenaries_config.json' },
        { id: 'heroClasses', url: 'assets/configs/hero/hero_classes.json' },
        { id: 'heroUpgrades', url: 'assets/configs/hero/hero_upgrades.json' },
        { id: 'perks', url: 'assets/configs/hero/perks_config.json' },
        { id: 'developmentTracks', url: 'assets/configs/hero/hero_upgrade_tracks.json' },
        { id: 'achievements', url: 'assets/configs/game/achievements_config.json' }
    ];

    const configs = {};

    async function fetchJson(url){
        const res = await fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
        return await res.json();
    }

    async function loadConfig(def){
        try {
            configs[def.id] = await fetchJson(def.url);
        } catch (e) {
            console.error('Failed to load config ' + def.id + ' from ' + def.url, e);
            throw e;
        }
    }

    async function init(){
        await Promise.all(CONFIG_DEFS.map(loadConfig));
    }

    function getConfig(id){
        return configs[id];
    }

    async function refresh(){
        await init();
    }

    window.StaticData = {
        init,
        getConfig,
        refresh,
        getConfigList: () => CONFIG_DEFS.map(d => ({ id: d.id }))
    };
})();
