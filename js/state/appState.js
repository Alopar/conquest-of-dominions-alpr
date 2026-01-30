window.app = window.app || {
    gameState: null,
    adventureState: null,
    config: { battle: null, source: undefined },
    monsters: null
};

window.battleConfig = null;
window.configLoaded = false;

function setBattleConfig(config, source) {
    window.app.config.battle = config || null;
    window.app.config.source = source;
    window.battleConfig = config || null;
    window.battleConfigSource = source;
    window.configLoaded = !!config;
}

function getBattleConfig() {
    return window.app.config && window.app.config.battle ? window.app.config.battle : window.battleConfig;
}

function setMonsters(types) {
    window.app.monsters = types || null;
}

function getMonsters() {
    return window.app.monsters;
}

function setGameState(state) {
    window.app.gameState = state || null;
    window.gameState = state || window.gameState;
}

function setAdventureState(state) {
    window.app.adventureState = state || null;
    window.adventureState = state || window.adventureState;
}

window.setBattleConfig = setBattleConfig;
window.getBattleConfig = getBattleConfig;
window.setMonsters = setMonsters;
window.getMonsters = getMonsters;
window.setGameState = setGameState;
window.setAdventureState = setAdventureState;

(function(){
    window.AppState = window.AppState || {
        space: 'lobby',
        screen: 'intro',
        subscreen: null,
        params: {},
        subParams: {}
    };

    const screenToSpace = {
        'intro': 'lobby',
        'settings': 'lobby',
        'bestiary': 'lobby',
        'achievements': 'lobby',
        'adventure-setup': 'lobby',
        'adventure': 'adventure',
        'adventure-main': 'adventure',
        'adventure-result': 'adventure',
        'battle': 'battle'
    };

    const screens = {
        'intro': { id: 'intro-screen', frag: 'fragments/intro.html', space: 'lobby' },
        'battle': { id: 'battle-screen', frag: 'fragments/battle-screen.html', space: 'battle', menu: { backLabel: 'Главная' } },
        'settings': { id: 'settings-screen', frag: 'fragments/settings.html', space: 'lobby' },
        'bestiary': { id: 'bestiary-screen', frag: 'fragments/bestiary.html', space: 'lobby', menu: { backLabel: 'Главная', back: function(){ if (window.backToIntroFromBestiary) window.backToIntroFromBestiary(); else if (window.showIntro) window.showIntro(); } } },
        'achievements': { id: 'achievements-screen', frag: 'fragments/achievements.html', space: 'lobby' },
        'adventure-setup': { id: 'adventure-setup-screen', frag: 'fragments/adventure-setup.html', space: 'lobby', menu: { backLabel: 'Главная', back: function(){ if (window.backToIntroFromAdventure) window.backToIntroFromAdventure(); else if (window.showIntro) window.showIntro(); } } },
        'adventure': { id: 'adventure-screen', frag: 'fragments/adventure-main.html', space: 'adventure', menu: { backLabel: 'Главная', back: function(){ if (window.backToIntroFromAdventure) window.backToIntroFromAdventure(); else if (window.showIntro) window.showIntro(); } } },
        'adventure-result': { id: 'adventure-result-screen', frag: 'fragments/adventure-result.html', space: 'adventure', menu: { backLabel: 'Главная', back: function(){ if (window.showIntro) window.showIntro(); } } }
    };

    async function setSpace(spaceName, params) {
        if (window.GameOrchestrator && typeof window.GameOrchestrator.switchSpace === 'function') {
            return window.GameOrchestrator.switchSpace(spaceName, params);
        }

        window.AppState.space = spaceName;
        window.AppState.params = params || {};

        try {
            if (window.eventBus) {
                window.eventBus.emit('space:changed', { space: spaceName, params: window.AppState.params });
            }
        } catch (e) {}
    }

    async function setScreen(name, params) {
        const prev = window.AppState.screen;
        const cfg = screens[name];
        if (!cfg) return;

        const targetSpace = cfg.space || screenToSpace[name] || 'lobby';
        const currentSpace = window.AppState.space;

        if (targetSpace !== currentSpace) {
            if (window.GameOrchestrator && typeof window.GameOrchestrator.switchSpace === 'function') {
                await window.GameOrchestrator.switchSpace(targetSpace, { screen: name, ...params });
                return;
            }
        }

        const spaceController = _getSpaceController(targetSpace);
        if (spaceController && typeof spaceController.showScreen === 'function') {
            await spaceController.showScreen(name, params);
            return;
        }

        try {
            if (window.eventBus) {
                window.eventBus.emit('screen:beforeChange', { from: prev, to: name, params: params || {} });
            }
        } catch (e) {}

        try {
            if (cfg.frag && window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
                await window.UI.ensureScreenLoaded(cfg.id, cfg.frag);
                if (cfg.menu && window.UI.ensureMenuBar) {
                    window.UI.ensureMenuBar(cfg.id, cfg.menu);
                }
            }
        } catch (e) {}

        if (typeof window.showScreen === 'function') {
            window.showScreen(cfg.id);
        }

        window.AppState.screen = name;
        window.AppState.params = params || {};

        try {
            if (window.eventBus) {
                window.eventBus.emit('screen:changed', { name, params: window.AppState.params });
            }
        } catch (e) {}
    }

    function setSubscreen(name, params) {
        const prev = window.AppState.subscreen;
        window.AppState.subscreen = name;
        window.AppState.subParams = params || {};

        const currentSpace = window.AppState.space;
        const spaceController = _getSpaceController(currentSpace);

        if (spaceController && typeof spaceController.showSubscreen === 'function') {
            spaceController.showSubscreen(name, params);
        }

        try {
            if (window.eventBus) {
                window.eventBus.emit('subscreen:changed', { from: prev, to: name, params: window.AppState.subParams });
            }
        } catch (e) {}
    }

    function _getSpaceController(spaceName) {
        switch (spaceName) {
            case 'lobby': return window.LobbySpace;
            case 'adventure': return window.AdventureSpace;
            case 'battle': return window.BattleSpace;
            default: return null;
        }
    }

    function show(name, params) {
        return setScreen(name, params);
    }

    function getSpace() {
        return window.AppState.space;
    }

    function getScreen() {
        return window.AppState.screen;
    }

    function getSubscreen() {
        return window.AppState.subscreen;
    }

    window.Router = {
        setSpace,
        setScreen,
        setSubscreen,
        show,
        getSpace,
        getScreen,
        getSubscreen
    };
})();
