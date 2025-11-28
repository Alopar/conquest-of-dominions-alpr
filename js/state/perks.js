import { safeCall, callIfExists } from '../core/errorHandler.js';
import { getConfig as getStaticConfig } from './staticData.js';
import { recompute as recomputeModifiers } from './modifiers.js';

var LS_KEY = 'perksState';

var state = {
    ownedPerkIds: []
};

function save(){
    safeCall(function() {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
    }, undefined, 'perks:save');
}

function load(){
    safeCall(function() {
        var raw = localStorage.getItem(LS_KEY);
        if (raw) state = Object.assign({}, state, JSON.parse(raw));
    }, undefined, 'perks:load');
    if (!Array.isArray(state.ownedPerkIds)) state.ownedPerkIds = [];
}

function getConfig(){
    return safeCall(function() {
        var cfg = getStaticConfig('perks');
        var list = cfg && Array.isArray(cfg.perks) ? cfg.perks : [];
        return list;
    }, [], 'perks:getConfig');
}

function byId(){
    var map = {};
    getConfig().forEach(function(p){ map[p.id] = p; });
    return map;
}

export function add(perkId){
    if (!perkId) return false;
    var set = new Set(state.ownedPerkIds || []);
    set.add(perkId);
    state.ownedPerkIds = Array.from(set);
    save();
    // Call recompute from modifiers directly
    if (recomputeModifiers) recomputeModifiers();
    else callIfExists('Modifiers', 'recompute', [], undefined);
    return true;
}

export function addMany(ids){
    (ids || []).forEach(function(id){ 
        if (!id) return;
        var set = new Set(state.ownedPerkIds || []);
        set.add(id);
        state.ownedPerkIds = Array.from(set);
    });
    save();
    if (recomputeModifiers) recomputeModifiers();
    else callIfExists('Modifiers', 'recompute', [], undefined);
    return true;
}

export function has(perkId){
    return (state.ownedPerkIds || []).includes(perkId);
}

export function getOwned(){
    var map = byId();
    return (state.ownedPerkIds || []).map(function(id){
        return map[id] || { id: id, name: id, icon: '💠', description: '', hidden: false, effects: [] };
    });
}

export function getPublicOwned(){
    return getOwned().filter(function(p){ return !p.hidden; });
}

export function clear(){
    state.ownedPerkIds = [];
    save();
    if (recomputeModifiers) recomputeModifiers();
    else callIfExists('Modifiers', 'recompute', [], undefined);
}

export function aggregateModifiers(){
    var mods = {
        combat: { hpBonus: { melee: 0, range: 0, support: 0 }, damageBonus: { melee: 0, range: 0, support: 0 }, supportTargetsBonus: 0 },
        rewards: { currency: {} }
    };
    getOwned().forEach(function(p){
        (Array.isArray(p.effects) ? p.effects : []).forEach(function(e){
            if (!e || typeof e.type !== 'string') return;
            if (e.type === 'stat' && e.path && typeof e.value === 'number') {
                if (e.path === 'combat.hp.melee') mods.combat.hpBonus.melee += e.value;
                else if (e.path === 'combat.hp.range') mods.combat.hpBonus.range += e.value;
                else if (e.path === 'combat.hp.support') mods.combat.hpBonus.support += e.value;
                else if (e.path === 'combat.damage.melee') mods.combat.damageBonus.melee += e.value;
                else if (e.path === 'combat.damage.range') mods.combat.damageBonus.range += e.value;
                else if (e.path === 'combat.damage.support') mods.combat.damageBonus.support += e.value;
                else if (e.path === 'combat.support.targets') mods.combat.supportTargetsBonus += e.value;
            } else if (e.type === 'multiplier' && e.path && typeof e.value === 'number') {
                if (e.path.indexOf('rewards.currency.') === 0) {
                    var id = e.path.substring('rewards.currency.'.length);
                    var cur = typeof mods.rewards.currency[id] === 'number' ? mods.rewards.currency[id] : 1;
                    mods.rewards.currency[id] = cur * e.value;
                }
            }
        });
    });
    return mods;
}

load();

export const Perks = {
    add,
    addMany,
    has,
    getOwned,
    getPublicOwned,
    clear,
    getAggregatedModifiers: aggregateModifiers
};

