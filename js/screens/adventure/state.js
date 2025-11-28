/**
 * @typedef {Object} AdventureState
 * @property {Object|null} config
 * @property {Object<string, number>} currencies
 * @property {Object<string, number>} pool
 * @property {string|null} selectedClassId
 * @property {number} currentStageIndex
 * @property {Array<string>} completedEncounterIds
 * @property {boolean} inBattle
 * @property {string} lastResult
 * @property {Object} nodeContents
 * @property {Array} currentNodeContent
 * @property {number|null} sectorStartDay
 * @property {number} sectorThreatLevel
 */

/** @type {AdventureState} */
var adventureState = {
    config: null,
    currencies: {},
    pool: {},
    selectedClassId: null,
    currentStageIndex: 0,
    completedEncounterIds: [],
    inBattle: false,
    lastResult: '',
    nodeContents: {},
    currentNodeContent: [],
    sectorStartDay: null,
    sectorThreatLevel: 0
};

var adventureUserLoaded = false;

/**
 * @returns {AdventureState}
 */
function getDefaultAdventureState() {
    return {
        config: null,
        currencies: {},
        pool: {},
        selectedClassId: null,
        currentStageIndex: 0,
        completedEncounterIds: [],
        inBattle: false,
        lastResult: '',
        nodeContents: {},
        currentNodeContent: [],
        sectorStartDay: null,
        sectorThreatLevel: 0
    };
}

/**
 * @param {Object} cfg
 */
function initAdventureState(cfg) {
    adventureState.config = cfg;
    adventureState.currencies = {};
    safeCall(function() {
        var arr = (cfg && cfg.adventure && Array.isArray(cfg.adventure.startingCurrencies)) ? cfg.adventure.startingCurrencies : [];
        for (var i = 0; i < arr.length; i++) {
            var c = arr[i];
            if (c && c.id) adventureState.currencies[c.id] = Math.max(0, Number(c.amount || 0));
        }
    }, undefined, 'initAdventureState:currencies');
    adventureState.pool = {};
    adventureState.selectedClassId = adventureState.selectedClassId || null;
    adventureState.currentStageIndex = 0;
    adventureState.completedEncounterIds = [];
    adventureState.inBattle = false;
    adventureState.lastResult = '';
    adventureState.nodeContents = adventureState.nodeContents || {};
    adventureState.currentNodeContent = adventureState.currentNodeContent || [];
    adventureState.sectorStartDay = adventureState.sectorStartDay || null;
    adventureState.sectorThreatLevel = adventureState.sectorThreatLevel || 0;
    persistAdventure();
    window.adventureState = adventureState;
    callIfExists('AdventureTime', 'init', [], undefined);
    callIfExists('Perks', 'clear', [], undefined);
    safeCall(function() {
        var def = callIfExists('Hero', 'getClassDef', [], null);
        var innate = def && Array.isArray(def.innatePerks) ? def.innatePerks : [];
        if (innate.length > 0) {
            callIfExists('Perks', 'addMany', [innate], undefined);
        }
    }, undefined, 'initAdventureState:innatePerks');
    safeCall(function() {
        var classId = callIfExists('Hero', 'getClassId', [], null);
        callIfExists('Tracks', 'initForClass', [classId], undefined);
    }, undefined, 'initAdventureState:tracks');
    callIfExists('Tracks', 'resetProgress', [], undefined);
    callIfExists('Raids', 'init', [], undefined);
}

function persistAdventure() {
    safeCall(function() {
        var toSave = Object.assign({}, adventureState);
        delete toSave.selectedClassId;
        localStorage.setItem('adventureState', JSON.stringify(toSave));
    }, undefined, 'persistAdventure');
}

function restoreAdventure() {
    safeCall(function() {
        var raw = localStorage.getItem('adventureState');
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            adventureState = Object.assign({}, adventureState, parsed, { selectedClassId: null });
            window.adventureState = adventureState;
        }
    }, undefined, 'restoreAdventure');
}

function resetAdventureState() {
    adventureState = getDefaultAdventureState();
    adventureUserLoaded = false;
    window.adventureState = adventureState;
    safeCall(function() {
        localStorage.removeItem('adventureState');
    }, undefined, 'resetAdventureState');
}

window.adventureState = adventureState;
window.adventureUserLoaded = adventureUserLoaded;
window.getDefaultAdventureState = getDefaultAdventureState;
window.initAdventureState = initAdventureState;
window.persistAdventure = persistAdventure;
window.restoreAdventure = restoreAdventure;
window.resetAdventureState = resetAdventureState;
