import { safeCall, callIfExists } from '../core/errorHandler.js';
import { getConfig } from './staticData.js';
import { getOwned as getOwnedPerks } from './perks.js'; // Circular dependency, might be undefined initially

var LS_KEY = 'modifiers:ownedPerks';

var ownedPerkIds = [];
var aggregates = {
    attackers: {
        hp: { melee: 0, range: 0, support: 0 },
        damage: { melee: 0, range: 0, support: 0 },
        targets: { melee: 0, range: 0, support: 0 }
    },
    defenders: {
        hp: { melee: 0, range: 0, support: 0 },
        damage: { melee: 0, range: 0, support: 0 },
        targets: { melee: 0, range: 0, support: 0 }
    },
    adventure: {
        rewards: { currency: {} },
        army: { size: 0 },
        access: { mercTiers: {} }
    }
};
var activeEffects = [];

function load(){
    safeCall(function() {
        var raw = localStorage.getItem(LS_KEY);
        if (raw) ownedPerkIds = JSON.parse(raw) || [];
    }, undefined, 'modifiers:load');
    if (!Array.isArray(ownedPerkIds)) ownedPerkIds = [];
    recompute();
}

function save(){
    safeCall(function() {
        localStorage.setItem(LS_KEY, JSON.stringify(ownedPerkIds));
    }, undefined, 'modifiers:save');
}

export function setOwnedPerks(ids){
    ownedPerkIds = Array.isArray(ids) ? ids.slice() : [];
    save();
    recompute();
}

export function addOwnedPerk(id){
    if (!id) return;
    if (!ownedPerkIds.includes(id)) {
        ownedPerkIds.push(id);
        save();
        recompute();
    }
}

function getPerksConfig(){
    return safeCall(function() {
        var cfg = getConfig('perks');
        var list = cfg && Array.isArray(cfg.perks) ? cfg.perks : [];
        return list;
    }, [], 'modifiers:getPerksConfig');
}

export function recompute(){
    var next = {
        attackers: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } },
        defenders: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } },
        adventure: { rewards: { currency: {} }, army: { size: 0 }, access: { mercTiers: {} } }
    };
    var effects = [];
    
    // Try to get owned perks from module or fallback to window
    var owned = null;
    try { owned = getOwnedPerks(); } catch (e) {}
    if (!owned && window.Perks) owned = window.Perks.getOwned();
    if (!owned) owned = []; // callIfExists('Perks', 'getOwned', [], []);

    if (!owned || owned.length === 0) {
        var perksCfg = getPerksConfig();
        var map = {};
        perksCfg.forEach(function(p){ map[p.id] = p; });
        owned = (ownedPerkIds || []).map(function(id){ return map[id]; }).filter(Boolean);
    }
    (owned || []).forEach(function(perk){
        (Array.isArray(perk.effects) ? perk.effects : []).forEach(function(eff){
            if (!eff || typeof eff.path !== 'string') return;
            var path = eff.path;
            var role = String(path.split('.')[2] || '').toLowerCase();
            var v = Number(eff.value || 0);
            if (eff.type === 'stat' && path.indexOf('combat.hp.') === 0) {
                if (role !== 'melee' && role !== 'range' && role !== 'support') return;
                next.attackers.hp[role] = (next.attackers.hp[role] || 0) + v;
                if (v !== 0) effects.push({ type: 'stat', path: 'combat.hp.' + role, value: v, side: 'attackers' });
            } else if (eff.type === 'stat' && path.indexOf('combat.damage.') === 0) {
                if (role !== 'melee' && role !== 'range' && role !== 'support') return;
                next.attackers.damage[role] = (next.attackers.damage[role] || 0) + v;
                if (v !== 0) effects.push({ type: 'stat', path: 'combat.damage.' + role, value: v, side: 'attackers' });
            } else if (eff.type === 'stat' && path.indexOf('combat.targets.') === 0) {
                var r2 = String(path.split('.')[2] || '').toLowerCase();
                if (r2 === 'melee' || r2 === 'range' || r2 === 'support') {
                    next.attackers.targets[r2] = (next.attackers.targets[r2] || 0) + v;
                    if (v !== 0) effects.push({ type: 'stat', path: 'combat.targets.' + r2, value: v, side: 'attackers' });
                }
            } else if (eff.type === 'stat' && path === 'combat.support.targets') {
                next.attackers.targets.support = (next.attackers.targets.support || 0) + v;
                if (v !== 0) effects.push({ type: 'stat', path: 'combat.targets.support', value: v, side: 'attackers' });
            } else if (eff.type === 'multiplier' && path.indexOf('rewards.currency.') === 0) {
                var cid = path.substring('rewards.currency.'.length);
                if (cid) {
                    var cur = typeof next.adventure.rewards.currency[cid] === 'number' ? next.adventure.rewards.currency[cid] : 1;
                    next.adventure.rewards.currency[cid] = cur * (Number(eff.value) || 1);
                    effects.push({ type: 'multiplier', path: 'rewards.currency.' + cid, value: Number(eff.value) || 1, side: 'adventure' });
                }
            } else if (eff.type === 'stat' && path === 'adventure.army.size') {
                var v2 = Number(eff.value || 0);
                next.adventure.army.size = (next.adventure.army.size || 0) + v2;
                if (v2 !== 0) effects.push({ type: 'stat', path: 'adventure.army.size', value: v2, side: 'adventure' });
            } else if (eff.type === 'access' && path === 'merc.tier') {
                var t = Number(eff.value || 0);
                if (t > 0) {
                    next.adventure.access.mercTiers[t] = true;
                    effects.push({ type: 'access', path: 'merc.tier', value: t, side: 'adventure' });
                }
            }
        });
    });
    aggregates = next;
    activeEffects = effects;
    safeCall(function() {
        if (window.AppState && window.AppState.subscreen === 'mods' && typeof window.renderModsDebug === 'function') {
            window.renderModsDebug();
        }
    }, undefined, 'modifiers:renderDebug');
}

export function reset(){
    aggregates = {
        attackers: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } },
        defenders: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } },
        adventure: { rewards: { currency: {} }, army: { size: 0 }, access: { mercTiers: {} } }
    };
    activeEffects = [];
}

export function resetAndRecompute(){ reset(); recompute(); }

export function getHpBonus(side, role){
    var s = (side === 'defenders') ? 'defenders' : 'attackers';
    var r = (role === 'range' || role === 'support') ? role : 'melee';
    return safeCall(function() { return Number(aggregates[s].hp[r] || 0); }, 0);
}

export function getDamageBonus(side, role){
    var s = (side === 'defenders') ? 'defenders' : 'attackers';
    var r = (role === 'range' || role === 'support') ? role : 'melee';
    return safeCall(function() { return Number(aggregates[s].damage[r] || 0); }, 0);
}

export function getTargetsBonus(side, role){
    var s = (side === 'defenders') ? 'defenders' : 'attackers';
    var r = (role === 'range' || role === 'support') ? role : 'melee';
    return safeCall(function() { return Number(aggregates[s].targets[r] || 0); }, 0);
}

export function getSnapshot(){
    return JSON.parse(JSON.stringify({ ownedPerkIds: ownedPerkIds, aggregates: aggregates, activeEffects: activeEffects }));
}

export function getRewardMultiplier(currencyId){
    return safeCall(function() {
        var m = aggregates.adventure.rewards.currency[String(currencyId)] || 1;
        return (typeof m === 'number' && m > 0) ? m : 1;
    }, 1);
}

export function getArmySizeBonus(){
    return safeCall(function() { return Number(aggregates.adventure.army.size || 0); }, 0);
}

export function hasMercTier(tier){
    return safeCall(function() { return !!aggregates.adventure.access.mercTiers[Number(tier||0)]; }, false);
}

load();

export const Modifiers = {
    setOwnedPerks,
    addOwnedPerk,
    recompute,
    reset,
    resetAndRecompute,
    getHpBonus,
    getDamageBonus,
    getTargetsBonus,
    getRewardMultiplier,
    getArmySizeBonus,
    hasMercTier,
    getSnapshot
};

