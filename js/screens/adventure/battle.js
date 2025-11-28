/**
 * @fileoverview Модуль логики боя в приключении
 */

/**
 * @returns {Array<{id: string, count: number}>}
 */
function pickSquadForBattle() {
    var monsters = window.battleConfig && window.battleConfig.unitTypes ? window.battleConfig.unitTypes : {};
    var assigned = (window.Raids && typeof window.Raids.getAssignedUnitsByType === 'function') ? window.Raids.getAssignedUnitsByType() : {};
    var ids = Object.keys(adventureState.pool).filter(function(id) { return adventureState.pool[id] > 0; });
    ids.sort(function(a, b) {
        var pa = typeof monsters[a] !== 'undefined' && typeof monsters[a].price === 'number' ? monsters[a].price : 10;
        var pb = typeof monsters[b] !== 'undefined' && typeof monsters[b].price === 'number' ? monsters[b].price : 10;
        return pb - pa;
    });
    var result = [];
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var total = adventureState.pool[id];
        var inRaids = Number(assigned[id] || 0);
        var available = Math.max(0, total - inRaids);
        if (available > 0) { result.push({ id: id, count: available }); }
    }
    return result;
}

/**
 * @param {Object} encData
 */
async function startEncounterBattle(encData) {
    var enc = encData;
    if (!enc) return;
    if (!adventureState.selectedClassId) return;
    if (Object.values(adventureState.pool).every(function(v) { return v <= 0; })) applySelectedClassStartingArmy();
    var attackers = pickSquadForBattle();
    if (attackers.length === 0) return;
    for (var i = 0; i < attackers.length; i++) {
        var g = attackers[i];
        adventureState.pool[g.id] -= g.count;
        if (adventureState.pool[g.id] < 0) adventureState.pool[g.id] = 0;
    }
    var isBoss = enc.class === 'boss';
    var threatMultiplier = isBoss ? getThreatMultiplier() : 1.0;
    var cfg = {
        battleConfig: { name: adventureState.config.adventure.name, defendersStart: true },
        armies: {
            attackers: { name: 'Отряд игрока', units: attackers },
            defenders: { name: enc.id, units: (enc.monsters || []).map(function(g) {
                var v = g && g.amount;
                var cnt = 0;
                if (typeof v === 'number') cnt = Math.max(0, Math.floor(v));
                else if (typeof v === 'string') {
                    var m = v.match(/^(\s*\d+)\s*-\s*(\d+\s*)$/);
                    if (m) {
                        var a = Number(m[1]); var b = Number(m[2]);
                        var min = Math.min(a, b); var max = Math.max(a, b);
                        cnt = min + Math.floor(Math.random() * (max - min + 1));
                    } else {
                        var n = Number(v);
                        if (!isNaN(n)) cnt = Math.max(0, Math.floor(n));
                    }
                }
                if (isBoss && threatMultiplier > 1.0) {
                    cnt = Math.floor(cnt * threatMultiplier);
                }
                return { id: g.id, count: cnt };
            }) }
        },
        unitTypes: (window.StaticData && typeof window.StaticData.getConfig === 'function') ? (function() {
            var m = window.StaticData.getConfig('monsters');
            return (m && m.unitTypes) ? m.unitTypes : m;
        })() : (window.battleConfig && window.battleConfig.unitTypes ? window.battleConfig.unitTypes : undefined)
    };
    window._lastEncounterData = enc;
    window.battleConfig = cfg;
    window.configLoaded = true;
    window.battleConfigSource = 'adventure';
    safeCall(function() { window._lastAttackersSentCount = attackers.reduce(function(a, g) { return a + Math.max(0, Number(g.count || 0)); }, 0); }, undefined, 'startEncounterBattle:attackersCount');
    adventureState.inBattle = true;
    persistAdventure();
    window.adventureState = adventureState;
    var logDiv = document.getElementById('battle-log');
    if (logDiv) logDiv.innerHTML = '';
    var btnHome = document.getElementById('battle-btn-home');
    if (btnHome) btnHome.style.display = 'none';
    if (window.showBattle) await window.showBattle();
    window.initializeArmies();
    window.renderArmies();
    safeCall(function() { window._autoPlaySpeed = 1; }, undefined, 'startEncounterBattle:autoPlaySpeed');
    safeCall(function() {
        var spBtn = document.getElementById('auto-speed-btn');
        if (spBtn) spBtn.textContent = '⏩ x1';
    }, undefined, 'startEncounterBattle:speedBtn');
    safeCall(function() { if (typeof window._rescheduleAutoPlayTick === 'function') window._rescheduleAutoPlayTick(); }, undefined, 'startEncounterBattle:reschedule');
    safeCall(function() {
        try { if (window._stopAutoPlay) window._stopAutoPlay(); } catch(ex) {}
        var autoEnabled = false;
        try {
            var s = (window.GameSettings && typeof window.GameSettings.get === 'function') ? window.GameSettings.get() : (typeof window.getCurrentSettings === 'function' ? window.getCurrentSettings() : null);
            autoEnabled = !!(s && s.battleSettings && s.battleSettings.autoPlay);
        } catch(ex) {}
        if (autoEnabled && typeof window.toggleAutoPlay === 'function' && !window._autoPlayActive) {
            window.toggleAutoPlay();
        }
    }, undefined, 'startEncounterBattle:autoPlay');
    window.addToLog('🚩 Бой приключения начался!');
}

function applySelectedClassStartingArmy() {
    var classId = (window.Hero && typeof window.Hero.getClassId === 'function') ? window.Hero.getClassId() : adventureState.selectedClassId;
    if (!classId) return;
    var startArmy = (window.Hero && typeof window.Hero.getStartingArmy === 'function') ? window.Hero.getStartingArmy() : [];
    adventureState.pool = {};
    var total = 0;
    for (var i = 0; i < startArmy.length; i++) {
        var g = startArmy[i];
        if (g && g.id && g.count > 0) {
            adventureState.pool[g.id] = (adventureState.pool[g.id] || 0) + g.count;
            total += g.count;
        }
    }
    safeCall(function() { if (window.Hero && typeof window.Hero.setArmyCurrent === 'function') window.Hero.setArmyCurrent(total); }, undefined, 'applySelectedClassStartingArmy:setArmyCurrent');
    persistAdventure();
}

var originalEndBattle = null;

function ensureEndBattleHook() {
    if (originalEndBattle) return;
    originalEndBattle = window.endBattle;
    window.endBattle = function(winner) {
        if (typeof originalEndBattle === 'function') originalEndBattle(winner);
        if (adventureState.inBattle) finishAdventureBattle(winner);
    };
}

/**
 * @param {string} winner
 */
async function finishAdventureBattle(winner) {
    adventureState.inBattle = false;
    persistAdventure();
    window.adventureState = adventureState;
    var enc = window._lastEncounterData;
    var raidData = window._currentRaidData;
    if (raidData) {
        if (winner === 'attackers') {
            await safeAsync((async function() {
                if (window.Raids && typeof window.Raids.completeRaid === 'function') {
                    var rewardResult = window.Raids.completeRaid(raidData.id);
                    if (rewardResult) {
                        await grantRewardsFromResult(rewardResult);
                    }
                }
            })(), undefined, 'finishAdventureBattle:raidComplete');
        } else {
            safeCall(function() {
                if (window.Raids && typeof window.Raids.failRaid === 'function') {
                    window.Raids.failRaid(raidData.id);
                }
            }, undefined, 'finishAdventureBattle:raidFail');
        }
        window._currentRaidData = null;
        await showAdventure();
        return;
    }
    if (winner === 'attackers' && enc) {
        var unitsDefs = (window.StaticData && window.StaticData.getConfig) ? (function() { var m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
        var survivors = (window.attackerArmy || []).map(function(u) {
            var def = unitsDefs[u.typeId] || {};
            return { id: u.typeId, count: 1, price: def.price || 10 };
        });
        var byId = {};
        for (var i = 0; i < survivors.length; i++) {
            var s = survivors[i];
            byId[s.id] = byId[s.id] || { id: s.id, count: 0 };
            byId[s.id].count += s.count;
        }
        for (var id in byId) {
            adventureState.pool[id] = (adventureState.pool[id] || 0) + byId[id].count;
        }
        persistAdventure();
        var rewardId = enc.rewardId;
        if (rewardId) {
            await safeAsync((async function() {
                if (window.Rewards && typeof window.Rewards.grantById === 'function') {
                    await window.Rewards.grantById(rewardId);
                }
            })(), undefined, 'finishAdventureBattle:grantReward');
        }
        adventureState.completedEncounterIds.push(enc.id);
        persistAdventure();
        safeCall(function() {
            if (window.Achievements && typeof window.Achievements.onEncounterCleared === 'function') {
                window.Achievements.onEncounterCleared(enc);
            }
        }, undefined, 'finishAdventureBattle:achievements');
    } else if (winner === 'defenders') {
        adventureState.lastResult = 'defeat';
        persistAdventure();
        showAdventureResult('Поражение!');
        return;
    }
    await showAdventure();
}

/**
 * @param {Object} result
 */
async function grantRewardsFromResult(result) {
    if (!result) return;
    if (result.currencies) {
        for (var id in result.currencies) {
            adventureState.currencies[id] = (adventureState.currencies[id] || 0) + Number(result.currencies[id] || 0);
        }
    }
    if (result.units) {
        for (var id in result.units) {
            adventureState.pool[id] = (adventureState.pool[id] || 0) + Number(result.units[id] || 0);
        }
    }
    persistAdventure();
}

ensureEndBattleHook();

window.pickSquadForBattle = pickSquadForBattle;
window.startEncounterBattle = startEncounterBattle;
window.applySelectedClassStartingArmy = applySelectedClassStartingArmy;
window.ensureEndBattleHook = ensureEndBattleHook;
window.finishAdventureBattle = finishAdventureBattle;
window.grantRewardsFromResult = grantRewardsFromResult;

