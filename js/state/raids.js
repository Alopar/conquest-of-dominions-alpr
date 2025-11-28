import { getConfig as getStaticConfig } from './staticData.js';
import { getCurrentDay as getAdventureDay } from './adventureTime.js';
import { eventBus } from '../core/eventBus.js';

const LS_KEY = 'raidsState';

let state = {
    activeRaids: []
};

function save(){
    try {
        if (window.adventureState) {
            window.adventureState.raids = state;
            if (typeof window.persistAdventure === 'function') window.persistAdventure();
        }
    } catch {}
}

export function load(){
    try {
        if (window.adventureState && window.adventureState.raids) {
            state = window.adventureState.raids;
        }
    } catch {}
}

export function init(){
    state = { activeRaids: [] };
    save();
}

function getRaidsConfig(){
    try {
        return getStaticConfig('raids');
    } catch { return null; }
}

export function getRaidDefById(raidDefId){
    try {
        const cfg = getRaidsConfig();
        const list = (cfg && Array.isArray(cfg.raids)) ? cfg.raids : [];
        return list.find(function(r){ return r && r.id === raidDefId; }) || null;
    } catch { return null; }
}

export function addAvailableRaids(raidDefIds){
    const ids = Array.isArray(raidDefIds) ? raidDefIds : [];
    for (const defId of ids) {
        const def = getRaidDefById(defId);
        if (!def) continue;
        const exists = state.activeRaids.some(function(r){ return r.raidDefId === defId && r.status === 'available'; });
        if (exists) continue;
        const instanceId = defId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        state.activeRaids.push({
            id: instanceId,
            raidDefId: defId,
            status: 'available',
            startDay: null,
            assignedUnits: {},
            encounterId: def.encounter_id,
            rewardId: def.reward_id,
            durationDays: Number(def.duration_days || 1)
        });
    }
    save();
}

export function clearNonStarted(){
    state.activeRaids = state.activeRaids.filter(function(r){ return r.status !== 'available'; });
    save();
}

export function startRaid(instanceId, assignedUnits){
    const raid = state.activeRaids.find(function(r){ return r.id === instanceId; });
    if (!raid || raid.status !== 'available') return false;
    const currentDay = getAdventureDay ? getAdventureDay() : 1;
    raid.status = 'started';
    raid.startDay = currentDay;
    raid.assignedUnits = Object.assign({}, assignedUnits || {});
    save();
    return true;
}

export function completeRaid(instanceId){
    const raid = state.activeRaids.find(function(r){ return r.id === instanceId; });
    return raid || null;
}

export function removeRaid(instanceId){
    state.activeRaids = state.activeRaids.filter(function(r){ return r.id !== instanceId; });
    save();
}

export function getAvailableRaids(){
    return state.activeRaids.filter(function(r){ return r.status === 'available'; });
}

export function getStartedRaids(){
    return state.activeRaids.filter(function(r){ return r.status === 'started'; });
}

export function getReadyRaids(){
    return state.activeRaids.filter(function(r){ return r.status === 'ready'; });
}

export function getAllRaids(){
    return state.activeRaids.slice();
}

export function getRaidById(instanceId){
    return state.activeRaids.find(function(r){ return r.id === instanceId; }) || null;
}

export function updateRaidsProgress(currentDay){
    const day = Number(currentDay || 1);
    let changed = false;
    for (const raid of state.activeRaids) {
        if (raid.status === 'started' && raid.startDay !== null) {
            const elapsed = day - Number(raid.startDay);
            if (elapsed >= Number(raid.durationDays)) {
                raid.status = 'ready';
                changed = true;
            }
        }
    }
    if (changed) save();
}

export function getTotalAssignedUnits(){
    let total = 0;
    for (const raid of state.activeRaids) {
        if (raid.status === 'started' || raid.status === 'ready') {
            const units = raid.assignedUnits || {};
            for (const unitId in units) {
                total += Number(units[unitId] || 0);
            }
        }
    }
    return total;
}

export function getAssignedUnitsByType(){
    const result = {};
    for (const raid of state.activeRaids) {
        if (raid.status === 'started' || raid.status === 'ready') {
            const units = raid.assignedUnits || {};
            for (const unitId in units) {
                result[unitId] = (result[unitId] || 0) + Number(units[unitId] || 0);
            }
        }
    }
    return result;
}

try {
    if (eventBus && typeof eventBus.on === 'function') {
        eventBus.on('adventure:dayPassed', function(payload){
            if (payload && typeof payload.newDay === 'number') {
                updateRaidsProgress(payload.newDay);
            }
        });
    }
} catch {}

export const Raids = {
    init,
    load,
    save,
    addAvailableRaids,
    clearNonStarted,
    startRaid,
    completeRaid,
    removeRaid,
    getAvailableRaids,
    getStartedRaids,
    getReadyRaids,
    getAllRaids,
    getRaidById,
    getRaidDefById,
    updateRaidsProgress,
    getTotalAssignedUnits,
    getAssignedUnitsByType
};


