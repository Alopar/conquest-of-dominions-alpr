import { safeCall, callIfExists } from '../core/errorHandler.js';
import { getConfig as getStaticConfig } from './staticData.js';
import { getArmySizeBonus } from './modifiers.js';
import { addMany as addPerks } from './perks.js';
import { initForClass as initDevelopment } from './development.js';
import { initForClass as initTracks } from './tracks.js';

var LS_KEY = 'heroState';

var state = {
    classId: null,
    ownedUpgradeIds: [],
    purchasedLevel: 0,
    army: { current: 0, max: 0 }
};

function save(){
    safeCall(function() {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
    }, undefined, 'hero:save');
}

function load(){
    safeCall(function() {
        var raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') state = Object.assign({}, state, parsed);
    }, undefined, 'hero:load');
}

export function reset(){
    state = { classId: null, ownedUpgradeIds: [], purchasedLevel: 0, army: { current: 0, max: 0 } };
    save();
}

export function setClassId(id){
    state.classId = id || null;
    state.ownedUpgradeIds = [];
    state.purchasedLevel = 0;
    state.army = { current: 0, max: 0 };
    save();
    
    if (initDevelopment) initDevelopment(id);
    else callIfExists('Development', 'initForClass', [id], undefined);
    
    if (initTracks) initTracks(id);
    else callIfExists('Tracks', 'initForClass', [id], undefined);
    
    safeCall(function() {
        var def = getClassDef();
        var baseMax = (def && def.stats && typeof def.stats.armySize === 'number') ? Math.max(0, def.stats.armySize) : 0;
        state.army.max = baseMax;
        state.army.current = 0;
        save();
        var innate = def && Array.isArray(def.innatePerks) ? def.innatePerks : [];
        if (innate.length > 0) {
            if (addPerks) addPerks(innate);
            else callIfExists('Perks', 'addMany', [innate], undefined);
        }
    }, undefined, 'hero:setClassId');
}

export function getClassId(){
    return state.classId;
}

export function getClassDef(){
    return safeCall(function() {
        var classesCfg = getStaticConfig('heroClasses');
        var list = classesCfg && Array.isArray(classesCfg.classes) ? classesCfg.classes : (Array.isArray(classesCfg) ? classesCfg : []);
        return list.find(function(x){ return x && x.id === state.classId; }) || null;
    }, null, 'hero:getClassDef');
}

export function getStartingArmy(){
    var def = getClassDef();
    var arr = (def && Array.isArray(def.startingArmy)) ? def.startingArmy : [];
    return arr.map(function(g){ return { id: g.id, count: g.count }; });
}

export function getArmyMax(){
    var base = Number(state.army && state.army.max || 0);
    var bonus = 0;
    if (getArmySizeBonus) bonus = getArmySizeBonus();
    else bonus = callIfExists('Modifiers', 'getArmySizeBonus', [], 0);
    return Math.max(0, base + bonus);
}

export function getArmyCurrent(){
    return Number(state.army && state.army.current || 0);
}

export function setArmyCurrent(n){
    state.army.current = Math.max(0, Number(n||0));
    save();
}

export function addOwnedUpgrades(ids){
    var set = new Set(state.ownedUpgradeIds || []);
    (ids || []).forEach(function(id){ if (id) set.add(id); });
    state.ownedUpgradeIds = Array.from(set);
    save();
}

export function hasUpgrade(id){
    return (state.ownedUpgradeIds || []).includes(id);
}

export function getPurchasedLevel(){
    return Number(state.purchasedLevel || 0);
}

export function setPurchasedLevel(lvl){
    state.purchasedLevel = Math.max(0, Number(lvl||0));
    save();
}

load();

export const Hero = {
    reset,
    load,
    save,
    setClassId,
    getClassId,
    getClassDef,
    getStartingArmy,
    getArmyMax,
    getArmyCurrent,
    setArmyCurrent,
    addOwnedUpgrades,
    hasUpgrade,
    getPurchasedLevel,
    setPurchasedLevel
};

