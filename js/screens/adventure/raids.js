/**
 * @fileoverview Модуль логики рейдов
 */

function renderRaids() {
    var container = document.getElementById('raids-container');
    if (!container) return;
    container.innerHTML = '';
    safeCall(function() { if (window.Raids && typeof window.Raids.load === 'function') window.Raids.load(); }, undefined, 'renderRaids:load');
    var allRaids = (window.Raids && typeof window.Raids.getAllRaids === 'function') ? window.Raids.getAllRaids() : [];
    if (allRaids.length === 0) {
        var empty = document.createElement('div');
        empty.style.textAlign = 'center';
        empty.style.color = '#888';
        empty.style.padding = '24px';
        empty.textContent = 'Нет доступных рейдов в этом секторе';
        container.appendChild(empty);
        return;
    }
    for (var i = 0; i < allRaids.length; i++) {
        var raid = allRaids[i];
        var def = (window.Raids && window.Raids.getRaidDefById) ? window.Raids.getRaidDefById(raid.raidDefId) : null;
        if (!def) continue;
        var tpl = document.getElementById('tpl-raid-card');
        var card = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        if (!tpl) card.className = 'raid-card';
        card.dataset.id = raid.id;
        var iconEl = card.querySelector('[data-role="icon"]');
        var nameEl = card.querySelector('[data-role="name"]');
        var durationEl = card.querySelector('[data-role="duration"]');
        var statusEl = card.querySelector('[data-role="status"]');
        if (iconEl) iconEl.textContent = def.icon || '⚔️';
        if (nameEl) nameEl.textContent = def.name || def.id;
        if (durationEl) {
            if (raid.status === 'available') {
                durationEl.textContent = 'Длительность: ' + raid.durationDays + ' дн.';
            } else if (raid.status === 'started') {
                var currentDay = (window.AdventureTime && window.AdventureTime.getCurrentDay) ? window.AdventureTime.getCurrentDay() : 1;
                var elapsed = currentDay - (raid.startDay || 0);
                var remaining = Math.max(0, raid.durationDays - elapsed);
                durationEl.textContent = 'Осталось: ' + remaining + ' дн.';
            } else if (raid.status === 'ready') {
                durationEl.textContent = 'Готов к завершению!';
            }
        }
        if (statusEl) {
            if (raid.status === 'available') {
                statusEl.textContent = 'Доступен';
                statusEl.style.color = '#cd853f';
            } else if (raid.status === 'started') {
                statusEl.textContent = 'В процессе';
                statusEl.style.color = '#888';
            } else if (raid.status === 'ready') {
                statusEl.textContent = 'Готов!';
                statusEl.style.color = '#4a4';
            }
        }
        if (raid.status === 'available') card.classList.add('raid-available');
        else if (raid.status === 'started') card.classList.add('raid-started');
        else if (raid.status === 'ready') card.classList.add('raid-ready');
        card.classList.add('clickable');
        (function(r) {
            card.addEventListener('click', function() { onRaidClick(r); });
        })(raid);
        container.appendChild(card);
    }
}

/**
 * @param {Object} raid
 */
async function onRaidClick(raid) {
    var def = (window.Raids && window.Raids.getRaidDefById) ? window.Raids.getRaidDefById(raid.raidDefId) : null;
    if (!def) return;
    if (raid.status === 'ready') {
        await showRaidCompleteModal(raid, def);
    } else {
        await showRaidDetailsModal(raid, def);
    }
}

/**
 * @param {Object} raid
 * @param {Object} def
 */
async function showRaidDetailsModal(raid, def) {
    var body = document.createElement('div');
    var desc = document.createElement('div');
    desc.style.textAlign = 'center';
    desc.style.margin = '8px 0 10px 0';
    desc.textContent = 'Длительность: ' + def.duration_days + ' дней';
    body.appendChild(desc);
    (function() { var sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '8px 0'; body.appendChild(sep); })();
    var encCfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('encounters') : null;
    var encounters = encCfg && Array.isArray(encCfg.encounters) ? encCfg.encounters : [];
    var enc = encounters.find(function(e) { return e && e.id === def.encounter_id; });
    if (enc) {
        var enemiesTitle = document.createElement('div');
        enemiesTitle.style.margin = '6px 0';
        enemiesTitle.style.color = '#cd853f';
        enemiesTitle.style.textAlign = 'center';
        enemiesTitle.textContent = 'Возможные противники';
        body.appendChild(enemiesTitle);
        var monsters = (window.StaticData && window.StaticData.getConfig) ? (function() { var m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
        var enemiesWrapTpl = document.getElementById('tpl-rewards-list');
        var enemiesWrap = enemiesWrapTpl ? enemiesWrapTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        var enemiesItems = enemiesWrap.querySelector('[data-role="items"]') || enemiesWrap;
        var uniqEnemyIds = Array.from(new Set((enc.monsters || []).map(function(g) { return g && g.id; }).filter(Boolean)));
        uniqEnemyIds.forEach(function(id) {
            var itemTpl = document.getElementById('tpl-reward-unit');
            var el = itemTpl ? itemTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
            if (!itemTpl) el.className = 'reward-item';
            el.classList.add('clickable');
            var m = monsters[id] || { name: id, view: '👤' };
            var iconEl = el.querySelector('.reward-icon') || el;
            var nameEl = el.querySelector('.reward-name');
            if (iconEl) iconEl.textContent = m.view || '👤';
            if (nameEl) nameEl.textContent = m.name || id;
            el.addEventListener('click', function(e) { try { e.stopPropagation(); } catch(ex) {} showUnitInfoModal(id); });
            enemiesItems.appendChild(el);
        });
        body.appendChild(enemiesWrap);
        (function() { var sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '10px 0 8px 0'; body.appendChild(sep); })();
    }
    var rewardsTitle = document.createElement('div');
    rewardsTitle.style.margin = '10px 0 6px 0';
    rewardsTitle.style.color = '#cd853f';
    rewardsTitle.style.textAlign = 'center';
    rewardsTitle.textContent = 'Возможные награды';
    body.appendChild(rewardsTitle);
    var rewardsCfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('rewards') : null;
    var rewardsTables = rewardsCfg && Array.isArray(rewardsCfg.tables) ? rewardsCfg.tables : [];
    var rewardTable = rewardsTables.find(function(t) { return t && t.id === def.reward_id; });
    if (rewardTable && Array.isArray(rewardTable.rewards)) {
        var curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
        var curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
        var curById = {};
        curList.forEach(function(c) { curById[c.id] = c; });
        var rewardsWrapTpl = document.getElementById('tpl-rewards-list');
        var rewardsWrap = rewardsWrapTpl ? rewardsWrapTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        var rewardsItems = rewardsWrap.querySelector('[data-role="items"]') || rewardsWrap;
        rewardTable.rewards.forEach(function(r) {
            if (r && r.type === 'currency') {
                var tplItem = document.getElementById('tpl-reward-currency');
                var el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
                if (!tplItem) el.className = 'reward-item';
                var cd = curById[r.id] || { name: r.id, icon: '💠' };
                var iconEl = el.querySelector('.reward-icon') || el;
                var nameEl = el.querySelector('.reward-name');
                if (iconEl) iconEl.textContent = cd.icon || '💠';
                if (nameEl) nameEl.textContent = cd.name || r.id;
                rewardsItems.appendChild(el);
            }
        });
        body.appendChild(rewardsWrap);
    }
    if (raid.status !== 'available') {
        safeCall(function() {
            if (window.UI && window.UI.showModal) window.UI.showModal(body, { type: 'info', title: (def.icon || '') + ' ' + def.name });
        }, undefined, 'showRaidDetailsModal:info');
        return;
    }
    var accepted = false;
    await safeAsync((async function() {
        if (window.UI && typeof window.UI.showModal === 'function') {
            var h = window.UI.showModal(body, { type: 'dialog', title: ((def.icon || '') + ' ' + def.name).trim(), yesText: 'Подготовиться', noText: 'Закрыть' });
            accepted = await h.closed;
        }
    })(), undefined, 'showRaidDetailsModal:confirm');
    if (!accepted) return;
    await showArmySplitModal(raid, def);
}

/**
 * @param {Object} raid
 * @param {Object} def
 */
async function showRaidCompleteModal(raid, def) {
    var body = document.createElement('div');
    var text = document.createElement('div');
    text.style.textAlign = 'center';
    text.style.margin = '8px 0';
    text.textContent = 'Рейд "' + def.name + '" готов к завершению!';
    body.appendChild(text);
    var accepted = false;
    await safeAsync((async function() {
        if (window.UI && typeof window.UI.showModal === 'function') {
            var h = window.UI.showModal(body, { type: 'dialog', title: ((def.icon || '') + ' ' + def.name).trim(), yesText: 'Завершить', noText: 'Отмена' });
            accepted = await h.closed;
        }
    })(), undefined, 'showRaidCompleteModal:confirm');
    if (!accepted) return;
    await startRaidBattle(raid);
}

/**
 * @param {Object} raid
 * @param {Object} def
 */
async function showArmySplitModal(raid, def) {
    var body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '16px';
    body.style.minWidth = '500px';
    var mainArmyBlock = document.createElement('div');
    mainArmyBlock.style.display = 'flex';
    mainArmyBlock.style.flexDirection = 'column';
    mainArmyBlock.style.gap = '8px';
    var mainTitle = document.createElement('div');
    mainTitle.textContent = 'Основная армия';
    mainTitle.style.fontWeight = 'bold';
    mainTitle.style.textAlign = 'center';
    mainTitle.style.color = '#cd853f';
    var mainList = document.createElement('div');
    mainList.id = 'army-split-main';
    mainList.style.display = 'flex';
    mainList.style.flexWrap = 'wrap';
    mainList.style.gap = '8px';
    mainList.style.justifyContent = 'center';
    mainList.style.minHeight = '60px';
    mainArmyBlock.appendChild(mainTitle);
    mainArmyBlock.appendChild(mainList);
    var raidArmyBlock = document.createElement('div');
    raidArmyBlock.style.display = 'flex';
    raidArmyBlock.style.flexDirection = 'column';
    raidArmyBlock.style.gap = '8px';
    var raidTitle = document.createElement('div');
    raidTitle.textContent = 'Отряд для рейда';
    raidTitle.style.fontWeight = 'bold';
    raidTitle.style.textAlign = 'center';
    raidTitle.style.color = '#cd853f';
    var raidList = document.createElement('div');
    raidList.id = 'army-split-raid';
    raidList.style.display = 'flex';
    raidList.style.flexWrap = 'wrap';
    raidList.style.gap = '8px';
    raidList.style.justifyContent = 'center';
    raidList.style.minHeight = '60px';
    raidArmyBlock.appendChild(raidTitle);
    raidArmyBlock.appendChild(raidList);
    body.appendChild(mainArmyBlock);
    body.appendChild(raidArmyBlock);
    var assigned = (window.Raids && typeof window.Raids.getAssignedUnitsByType === 'function') ? window.Raids.getAssignedUnitsByType() : {};
    var mainArmy = {};
    var raidArmy = {};
    var pool = adventureState.pool || {};
    for (var unitId in pool) {
        var total = Number(pool[unitId] || 0);
        var inRaids = Number(assigned[unitId] || 0);
        var available = Math.max(0, total - inRaids);
        if (available > 0) mainArmy[unitId] = available;
    }
    function renderSplit() {
        var monsters = (window.StaticData && window.StaticData.getConfig) ? (function() { var m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
        mainList.innerHTML = '';
        raidList.innerHTML = '';
        for (var unitId in mainArmy) {
            if (mainArmy[unitId] <= 0) continue;
            var tpl = document.getElementById('tpl-raid-army-unit');
            var el = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
            el.dataset.id = unitId;
            var m = monsters[unitId] || { name: unitId, view: '👤' };
            var iconEl = el.querySelector('[data-role="icon"]');
            var nameEl = el.querySelector('[data-role="name"]');
            var countEl = el.querySelector('[data-role="count"]');
            if (iconEl) iconEl.textContent = m.view || '👤';
            if (nameEl) nameEl.textContent = m.name || unitId;
            if (countEl) countEl.textContent = 'x' + mainArmy[unitId];
            (function(uid) {
                el.addEventListener('click', function() {
                    if (mainArmy[uid] > 0) {
                        var totalMainArmy = Object.values(mainArmy).reduce(function(sum, v) { return sum + Number(v || 0); }, 0);
                        if (totalMainArmy <= 1) {
                            if (window.UI && window.UI.showToast) window.UI.showToast('error', 'В основной армии должен остаться хотя бы один юнит');
                            return;
                        }
                        mainArmy[uid]--;
                        raidArmy[uid] = (raidArmy[uid] || 0) + 1;
                        renderSplit();
                    }
                });
            })(unitId);
            mainList.appendChild(el);
        }
        for (var unitId in raidArmy) {
            if (raidArmy[unitId] <= 0) continue;
            var tpl = document.getElementById('tpl-raid-army-unit');
            var el = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
            el.dataset.id = unitId;
            var m = monsters[unitId] || { name: unitId, view: '👤' };
            var iconEl = el.querySelector('[data-role="icon"]');
            var nameEl = el.querySelector('[data-role="name"]');
            var countEl = el.querySelector('[data-role="count"]');
            if (iconEl) iconEl.textContent = m.view || '👤';
            if (nameEl) nameEl.textContent = m.name || unitId;
            if (countEl) countEl.textContent = 'x' + raidArmy[unitId];
            (function(uid) {
                el.addEventListener('click', function() {
                    if (raidArmy[uid] > 0) {
                        raidArmy[uid]--;
                        mainArmy[uid] = (mainArmy[uid] || 0) + 1;
                        renderSplit();
                    }
                });
            })(unitId);
            raidList.appendChild(el);
        }
    }
    renderSplit();
    var accepted = false;
    await safeAsync((async function() {
        if (window.UI && typeof window.UI.showModal === 'function') {
            var h = window.UI.showModal(body, { type: 'dialog', title: 'Разделение армии', yesText: 'Отправить', noText: 'Отмена' });
            accepted = await h.closed;
        }
    })(), undefined, 'showArmySplitModal:confirm');
    if (!accepted) return;
    var totalRaid = Object.values(raidArmy).reduce(function(sum, v) { return sum + Number(v || 0); }, 0);
    if (totalRaid === 0) {
        if (window.UI && window.UI.showToast) window.UI.showToast('error', 'Нужно выделить хотя бы один юнит для рейда');
        return;
    }
    if (window.Raids && typeof window.Raids.startRaid === 'function') {
        var success = window.Raids.startRaid(raid.id, raidArmy);
        if (success) {
            if (window.UI && window.UI.showToast) window.UI.showToast('success', 'Рейд "' + def.name + '" начат!');
            renderAdventure();
            renderRaids();
        }
    }
}

/**
 * @param {Object} raidInstance
 * @returns {Array}
 */
function pickSquadForRaid(raidInstance) {
    var units = raidInstance.assignedUnits || {};
    var result = [];
    for (var unitId in units) {
        var count = Number(units[unitId] || 0);
        if (count > 0) result.push({ id: unitId, count: count });
    }
    return result;
}

/**
 * @param {Object} raidInstance
 */
async function startRaidBattle(raidInstance) {
    var encCfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('encounters') : null;
    var encounters = encCfg && Array.isArray(encCfg.encounters) ? encCfg.encounters : [];
    var enc = encounters.find(function(e) { return e && e.id === raidInstance.encounterId; });
    if (!enc) return;
    var attackers = pickSquadForRaid(raidInstance);
    if (attackers.length === 0) return;
    var cfg = {
        battleConfig: { name: 'Рейд', defendersStart: true },
        armies: {
            attackers: { name: 'Отряд рейда', units: attackers },
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
                return { id: g.id, count: cnt };
            }) }
        },
        unitTypes: (window.StaticData && typeof window.StaticData.getConfig === 'function') ? (function() {
            var m = window.StaticData.getConfig('monsters');
            return (m && m.unitTypes) ? m.unitTypes : m;
        })() : (window.battleConfig && window.battleConfig.unitTypes ? window.battleConfig.unitTypes : undefined)
    };
    window._currentRaidData = raidInstance;
    window._lastEncounterData = null;
    window.battleConfig = cfg;
    window.configLoaded = true;
    window.battleConfigSource = 'raid';
    safeCall(function() { window._lastAttackersSentCount = attackers.reduce(function(a, g) { return a + Math.max(0, Number(g.count || 0)); }, 0); }, undefined, 'startRaidBattle:attackersCount');
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
    safeCall(function() { window._autoPlaySpeed = 1; }, undefined, 'startRaidBattle:autoPlaySpeed');
    safeCall(function() {
        var spBtn = document.getElementById('auto-speed-btn');
        if (spBtn) spBtn.textContent = '⏩ x1';
    }, undefined, 'startRaidBattle:speedBtn');
    safeCall(function() { if (typeof window._rescheduleAutoPlayTick === 'function') window._rescheduleAutoPlayTick(); }, undefined, 'startRaidBattle:reschedule');
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
    }, undefined, 'startRaidBattle:autoPlay');
    window.addToLog('🚩 Рейд начался!');
}

window.renderRaids = renderRaids;
window.onRaidClick = onRaidClick;
window.showRaidDetailsModal = showRaidDetailsModal;
window.showRaidCompleteModal = showRaidCompleteModal;
window.showArmySplitModal = showArmySplitModal;
window.pickSquadForRaid = pickSquadForRaid;
window.startRaidBattle = startRaidBattle;

