import { callIfExists } from '../core/errorHandler.js';
import { getConfig as getStaticConfig } from './staticData.js';
import { getRewardMultiplier } from './modifiers.js';
import { onCurrencyEarned } from './achievements.js';
import { setArmyCurrent, getArmyCurrent } from './hero.js';
import { addMany as addPerks } from './perks.js';

function getCurrenciesMap(){
    try {
        const curDefs = getStaticConfig('currencies');
        const list = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
        const map = {}; list.forEach(function(c){ map[c.id] = c; });
        return map;
    } catch { return {}; }
}

function getUnitsMap(){
    try {
        const monstersCfg = getStaticConfig('monsters');
        const src = (monstersCfg && monstersCfg.unitTypes) ? monstersCfg.unitTypes : monstersCfg;
        return src || {};
    } catch { return {}; }
}

function getPerksMap(){
    try {
        const cfg = getStaticConfig('perks');
        const list = cfg && Array.isArray(cfg.perks) ? cfg.perks : [];
        const map = {}; list.forEach(function(p){ map[p.id] = p; });
        return map;
    } catch { return {}; }
}

function parseAmount(value){
    if (typeof value === 'number') return Math.max(0, Math.floor(value));
    if (typeof value === 'string') {
        const m = value.match(/^(\s*\d+)\s*-\s*(\d+\s*)$/);
        if (m) {
            const a = Number(m[1]);
            const b = Number(m[2]);
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const r = min + Math.floor(Math.random() * (max - min + 1));
            return Math.max(0, r);
        }
        const n = Number(value);
        if (!isNaN(n)) return Math.max(0, Math.floor(n));
    }
    return 0;
}

function getRewardsConfig(){
    try { return getStaticConfig('rewards'); } catch { return null; }
}

function getTables(){
    try { const cfg = getRewardsConfig(); return (cfg && Array.isArray(cfg.tables)) ? cfg.tables : []; } catch { return []; }
}

function pickTableByTier(tier){
    const t = Number(tier || 0);
    const tables = getTables().filter(function(tb){ return Number(tb.tier) === t; });
    if (tables.length === 0) return null;
    const idx = Math.floor(Math.random() * tables.length);
    return tables[idx];
}

function byIdMap(){ const map = {}; getTables().forEach(function(tb){ map[tb.id] = tb; }); return map; }

function applyModifiers(items){
    try {
        return items.map(function(it){
            if (it.type === 'currency') {
                let mult = 1;
                try { if (getRewardMultiplier) mult = Number(getRewardMultiplier(it.id) || 1); } catch {}
                const amount = Math.max(0, Math.floor(Number(it.amount || 0) * (mult > 0 ? mult : 1)));
                return Object.assign({}, it, { amount });
            }
            return it;
        });
    } catch { return items; }
}

export function generate(table){
    if (!table || !Array.isArray(table.rewards)) return { items: [] };
    const raw = table.rewards.map(function(r){
        const amount = parseAmount(r.amount);
        const type = (r.type === 'monster') ? 'unit' : r.type;
        return { type, id: r.id, amount };
    });
    if (table.mode === 'select') return { pick: raw };
    return { items: raw };
}

function showRewards(items){
    return new Promise(function(resolve){
        try {
            const body = document.createElement('div');
            const tpl = document.getElementById('tpl-rewards-list');
            const wrap = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
            const itemsEl = wrap.querySelector('[data-role="items"]') || wrap;
            const curMap = getCurrenciesMap();
            const unitMap = getUnitsMap();
            const perkMap = getPerksMap();
            (items || []).forEach(function(r){
                let el = null;
                if (r.type === 'currency') el = document.getElementById('tpl-reward-currency')?.content.firstElementChild.cloneNode(true);
                else if (r.type === 'unit') el = document.getElementById('tpl-reward-unit')?.content.firstElementChild.cloneNode(true);
                else if (r.type === 'perk') el = document.getElementById('tpl-reward-perk')?.content.firstElementChild.cloneNode(true);
                if (!el) { el = document.createElement('div'); el.textContent = r.id + ' x' + r.amount; }
                el.dataset.id = String(r.id);
                const nameEl = el.querySelector('.reward-name');
                const iconEl = el.querySelector('.reward-icon') || el;
                if (r.type === 'currency') {
                    const cd = curMap[r.id] || { name: r.id, icon: '💠' };
                    if (iconEl) iconEl.textContent = cd.icon || '💠';
                    if (nameEl) nameEl.textContent = `${cd.name} x${r.amount}`;
                } else if (r.type === 'unit') {
                    const u = unitMap[r.id] || { name: r.id, view: '👤' };
                    if (iconEl) iconEl.textContent = u.view || '👤';
                    if (nameEl) nameEl.textContent = `${u.name || r.id} x${r.amount}`;
                } else if (r.type === 'perk') {
                    const p = perkMap[r.id] || { name: r.id, icon: '🥈' };
                    if (iconEl) iconEl.textContent = p.icon || '🥈';
                    if (nameEl) nameEl.textContent = String(p.name || r.id);
                } else {
                    if (nameEl) nameEl.textContent = (r.id + ' x' + r.amount);
                }
                itemsEl.appendChild(el);
            });
            body.appendChild(wrap);
            const h = callIfExists('UI', 'showModal', [body, { type: 'confirm', title: 'НАГРАДЫ' }], null);
            if (h && h.closed) h.closed.then(function(){ resolve(true); }); else resolve(true);
        } catch { resolve(true); }
    });
}

function showSelect(items){
    return new Promise(function(resolve){
        let selected = null;
        try {
            const body = document.createElement('div');
            const tpl = document.getElementById('tpl-rewards-list');
            const wrap = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
            const itemsEl = wrap.querySelector('[data-role="items"]') || wrap;
            const curMap = getCurrenciesMap();
            const unitMap = getUnitsMap();
            const perkMap = getPerksMap();
            (items || []).forEach(function(r){
                let el = null;
                if (r.type === 'currency') el = document.getElementById('tpl-reward-currency')?.content.firstElementChild.cloneNode(true);
                else if (r.type === 'unit') el = document.getElementById('tpl-reward-unit')?.content.firstElementChild.cloneNode(true);
                else if (r.type === 'perk') el = document.getElementById('tpl-reward-perk')?.content.firstElementChild.cloneNode(true);
                if (!el) { el = document.createElement('div'); el.textContent = r.id + ' x' + r.amount; }
                el.dataset.id = String(r.id);
                el.tabIndex = 0;
                el.style.outline = 'none';
                try { el.classList.add('clickable'); } catch {}
                el.addEventListener('click', function(){
                    selected = r;
                    itemsEl.querySelectorAll('.reward-item').forEach(function(n){ n.classList.remove('selected'); });
                    el.classList.add('selected');
                    try { const btn = modalWin && modalWin.querySelector('[data-action="yes"]'); if (btn) btn.disabled = false; } catch {}
                });
                const nameEl = el.querySelector('.reward-name');
                const iconEl = el.querySelector('.reward-icon') || el;
                if (r.type === 'currency') {
                    const cd = curMap[r.id] || { name: r.id, icon: '💠' };
                    if (iconEl) iconEl.textContent = cd.icon || '💠';
                    if (nameEl) nameEl.textContent = `${cd.name} x${r.amount}`;
                } else if (r.type === 'unit') {
                    const u = unitMap[r.id] || { name: r.id, view: '👤' };
                    if (iconEl) iconEl.textContent = u.view || '👤';
                    if (nameEl) nameEl.textContent = `${u.name || r.id} x${r.amount}`;
                } else if (r.type === 'perk') {
                    const p = perkMap[r.id] || { name: r.id, icon: '🥈' };
                    if (iconEl) iconEl.textContent = p.icon || '🥈';
                    if (nameEl) nameEl.textContent = String(p.name || r.id);
                } else {
                    if (nameEl) nameEl.textContent = (r.id + ' x' + r.amount);
                }
                itemsEl.appendChild(el);
            });
            const note = document.createElement('div'); note.textContent = 'Выбери одно'; note.style.textAlign = 'center'; note.style.margin = '8px 0 10px 0';
            body.appendChild(note);
            body.appendChild(wrap);
            let modalWin = null;
            const h = callIfExists('UI', 'showModal', [body, { type: 'reward-pick', title: 'НАГРАДЫ', yesDisabled: true }], null);
            if (h && h.closed) h.closed.then(function(ok){ resolve(ok && selected ? [selected] : []); }); else resolve([]);
            modalWin = document.body.querySelector('.modal-window:last-of-type');
        } catch { resolve([]); }
    });
}

function distribute(items){
    try {
        const curMap = getCurrenciesMap();
        const unitMap = getUnitsMap();
        const perkMap = getPerksMap();
        (items || []).forEach(function(r){
            if (r.type === 'currency') {
                window.adventureState = window.adventureState || {};
                window.adventureState.currencies = window.adventureState.currencies || {};
                window.adventureState.currencies[r.id] = (window.adventureState.currencies[r.id] || 0) + Math.max(0, Number(r.amount || 0));
                try { if (onCurrencyEarned) onCurrencyEarned(r.id, Number(r.amount||0)); } catch {}
                try {
                    const cd = curMap[r.id] || { name: r.id, icon: '' };
                    callIfExists('UI', 'showToast', ['copper', `${cd.name}: +${r.amount} ${cd.icon || ''}`], undefined);
                } catch {}
            } else if (r.type === 'unit') {
                window.adventureState = window.adventureState || {};
                window.adventureState.pool = window.adventureState.pool || {};
                window.adventureState.pool[r.id] = (window.adventureState.pool[r.id] || 0) + Math.max(0, Number(r.amount || 0));
                try { if (setArmyCurrent) setArmyCurrent(((getArmyCurrent && getArmyCurrent()) || 0) + Math.max(0, Number(r.amount || 0))); } catch {}
                try {
                    const u = unitMap[r.id] || { name: r.id };
                    callIfExists('UI', 'showToast', ['copper', `Союзник: ${u.name || r.id} x${r.amount}`], undefined);
                } catch {}
            } else if (r.type === 'perk') {
                try { if (addPerks) addPerks([r.id]); } catch {}
                try {
                    const p = perkMap[r.id] || { name: r.id, icon: '🥈' };
                    callIfExists('UI', 'showToast', ['silver', `Перк: ${p.name || r.id} ${p.icon || ''}`], undefined);
                } catch {}
            }
        });
        try { window.persistAdventure && window.persistAdventure(); } catch {}
    } catch {}
}

export async function grantById(rewardId){
    const map = byIdMap();
    const table = map[String(rewardId)];
    if (!table) return;
    const g = generate(table);
    if (g.pick) {
        const chosen = await showSelect(applyModifiers(g.pick));
        distribute(chosen);
    } else {
        const items = applyModifiers(g.items);
        await showRewards(items);
        distribute(items);
    }
}

export async function grantByTier(tier){
    const table = pickTableByTier(tier);
    if (!table) return;
    return grantById(table.id);
}

export const Rewards = { grantById, grantByTier, generate };



