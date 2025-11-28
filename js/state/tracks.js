import { safeCall, callIfExists } from '../core/errorHandler.js';
import { getConfig as getStaticConfig } from './staticData.js';
import { getClassDef as getHeroClassDef } from './hero.js';
import { addMany as addPerks } from './perks.js';
import { recompute as recomputeModifiers } from './modifiers.js';

const LS_KEY_PREFIX = 'tracksState:';

let classId = null;
let progressByTrackId = {}; // { [trackId]: number }
let unlockedByClassId = {}; // { [classId]: Set<string> } — доп. треки, разблокированные для класса

function lsKey(){ return LS_KEY_PREFIX + (classId || 'none'); }

function save(){
    try { localStorage.setItem(lsKey(), JSON.stringify({ progressByTrackId })); } catch {}
}

function load(){
    progressByTrackId = {};
    try {
        const raw = localStorage.getItem(lsKey());
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.progressByTrackId && typeof parsed.progressByTrackId === 'object') {
            progressByTrackId = Object.assign({}, parsed.progressByTrackId);
        }
    } catch {}
}

function getTracksConfig(){
    try {
        const cfg = getStaticConfig('developmentTracks');
        const list = cfg && Array.isArray(cfg.tracks) ? cfg.tracks : (Array.isArray(cfg) ? cfg : []);
        return list;
    } catch { return []; }
}

function mapById(){ const m = {}; getTracksConfig().forEach(function(t){ m[t.id] = t; }); return m; }

export function getAvailableTracks(){
    try {
        const cls = getHeroClassDef ? getHeroClassDef() : null;
        const allowed = cls && Array.isArray(cls.developmentTracks) ? cls.developmentTracks : [];
        const map = mapById();
        const res = [];
        const extra = Array.isArray(unlockedByClassId[classId]) ? unlockedByClassId[classId] : (unlockedByClassId[classId] instanceof Set ? Array.from(unlockedByClassId[classId]) : []);
        const finalIds = (allowed.length > 0) ? Array.from(new Set([].concat(allowed, extra))) : Object.keys(map);
        finalIds.forEach(function(id){ if (map[id]) res.push(map[id]); });
        return res;
    } catch { return []; }
}

export function getProgress(trackId){ return Number(progressByTrackId[trackId] || 0); }

export function setProgress(trackId, value){ progressByTrackId[trackId] = Math.max(0, Number(value||0)); save(); }

export function initForClass(id){ classId = id || null; load(); if (!unlockedByClassId[classId]) unlockedByClassId[classId] = new Set(); }

export function resetProgress(){
    progressByTrackId = {};
    save();
}

function ensureCurrencyAvailable(currencyId, totalCost){
    const cur = (window.adventureState && window.adventureState.currencies) ? window.adventureState.currencies : {};
    const have = Number(cur[currencyId] || 0);
    return have >= Number(totalCost || 0);
}

function spendCurrency(currencyId, totalCost){
    if (!window.adventureState || !window.adventureState.currencies) return false;
    window.adventureState.currencies[currencyId] = Math.max(0, Number(window.adventureState.currencies[currencyId] || 0) - Number(totalCost || 0));
    try { if (typeof window.persistAdventure === 'function') window.persistAdventure(); } catch {}
    return true;
}

function collectNewPerks(track, fromValue, toValue){
    const arr = [];
    const thresholds = Array.isArray(track.thresholds) ? track.thresholds : [];
    thresholds.forEach(function(th){
        if (typeof th.value === 'number' && th.value > fromValue && th.value <= toValue) {
            if (Array.isArray(th.grantsPerks)) arr.push.apply(arr, th.grantsPerks);
        }
    });
    return arr;
}

function getMaxThresholdValue(track){
    const th = Array.isArray(track && track.thresholds) ? track.thresholds : [];
    if (th.length === 0) return Infinity;
    return Math.max.apply(null, th.map(function(x){ return Number(x && x.value || 0); }));
}

export function canInvest(trackId, units){
    const t = mapById()[trackId];
    if (!t) return { ok: false, reason: 'no_track' };
    const u = Math.max(1, Number(units || 1));
    const current = getProgress(trackId);
    const maxVal = getMaxThresholdValue(t);
    if (current >= maxVal) return { ok: false, reason: 'max_reached' };
    const cost = Number(t.unitCost || 0) * u;
    const ok = ensureCurrencyAvailable(t.currencyId, cost);
    return { ok, requiredPrice: [{ id: t.currencyId, amount: cost }] };
}

export function invest(trackId, units){
    const ch = canInvest(trackId, units);
    if (!ch.ok) return false;
    const t = mapById()[trackId];
    const u = Math.max(1, Number(units || 1));
    const prev = getProgress(trackId);
    const maxVal = getMaxThresholdValue(t);
    const effective = Math.max(0, Math.min(u, (isFinite(maxVal) ? (maxVal - prev) : u)));
    if (effective <= 0) return false;
    const next = prev + effective;
    // списание валюты
    const total = Number(t.unitCost || 0) * effective;
    spendCurrency(t.currencyId, total);
    // фиксация прогресса
    setProgress(trackId, next);
    // выдача перков
    try {
        const perks = collectNewPerks(t, prev, next);
        if (perks.length > 0) {
            if (addPerks) addPerks(perks);
            else callIfExists('Perks', 'addMany', [perks], undefined);
            
            try {
                if (window.UI && typeof window.UI.showToast === 'function') {
                    const cfg = getStaticConfig('perks');
                    const list = cfg && Array.isArray(cfg.perks) ? cfg.perks : [];
                    const byId = {}; list.forEach(function(p){ byId[p.id] = p; });
                    const text = perks.map(function(id){ const p = byId[id] || { id, name: id, icon: '🥇' }; return `${p.icon || '🥇'} ${p.name || id}`; }).join(', ');
                    window.UI.showToast('gold', `Получено: ${text}`);
                }
            } catch {}
        }
    } catch {}
    
    try { 
        if (recomputeModifiers) recomputeModifiers();
        else callIfExists('Modifiers', 'recompute', [], undefined);
    } catch {}
    return true;
}

// API: разблокировать трек по существующему ID для текущего класса (если у класса задан whitelist)
export function unlockTrackForCurrentClass(trackId){
    if (!classId || !trackId) return false;
    if (!unlockedByClassId[classId]) unlockedByClassId[classId] = new Set();
    unlockedByClassId[classId].add(trackId);
    return true;
}

export const Tracks = {
    initForClass,
    resetProgress,
    unlockTrackForCurrentClass,
    getAvailableTracks,
    getProgress,
    canInvest,
    invest
};



