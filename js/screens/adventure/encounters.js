/**
 * @fileoverview Модуль логики встреч и событий
 */

/**
 * @returns {Object<string, Object>}
 */
function getEncountersIndex() {
    var encCfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('encounters') : null;
    var list = encCfg && Array.isArray(encCfg.encounters) ? encCfg.encounters : [];
    var map = {};
    for (var i = 0; i < list.length; i++) {
        var e = list[i];
        map[e.id] = e;
    }
    return map;
}

/**
 * @returns {null}
 */
function getCurrentStage() { return null; }

/**
 * @param {string} id
 * @returns {boolean}
 */
function isEncounterDone(id) {
    return adventureState.completedEncounterIds.includes(id);
}

/**
 * @returns {Array}
 */
function getAvailableEncountersForCurrentStage() { return []; }

/**
 * @param {string} nodeId
 */
function resolveGraphNode(nodeId) {
    safeCall(function() {
        var map = adventureState.map;
        if (!map) { renderAdventure(); return; }
        var node = map.nodes[nodeId];
        if (!node) { renderAdventure(); return; }
        adventureState.resolvedNodeIds = Array.isArray(adventureState.resolvedNodeIds) ? adventureState.resolvedNodeIds : [];
        if (!adventureState.resolvedNodeIds.includes(nodeId)) adventureState.resolvedNodeIds.push(nodeId);
        persistAdventure();
        renderAdventure();
    }, function() { renderAdventure(); }, 'resolveGraphNode');
}

/**
 * @param {Object} node
 */
async function handleEventNode(node) {
    await safeAsync((async function() {
        var cfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('events') : null;
        var list = (cfg && Array.isArray(cfg.events)) ? cfg.events : [];
        var tier = Number(node && node.tier || 1);
        var pool = list.filter(function(ev) { return Number(ev && ev.tier) === tier; });
        var e = (pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : (list[0] || null));
        if (!e) { renderAdventure(); return; }
        if (window.UI && typeof window.UI.showModal === 'function') {
            var body = document.createElement('div');
            var text = document.createElement('div');
            text.textContent = e.description || e.name || e.id;
            text.style.textAlign = 'center';
            text.style.margin = '8px 0 10px 0';
            body.appendChild(text);
            var wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.justifyContent = 'center';
            wrap.style.gap = '10px';
            body.appendChild(wrap);
            var h = window.UI.showModal(body, { type: 'dialog', title: e.name || 'Событие', yesText: e.options && e.options[0] ? e.options[0].text : 'Ок', noText: e.options && e.options[1] ? e.options[1].text : 'Пропустить' });
            h.closed.then(async function(ok) {
                var opt = ok ? (e.options && e.options[0]) : (e.options && e.options[1]);
                await applyEffects(opt && opt.effects);
                renderAdventure();
            });
        } else { renderAdventure(); }
    })(), function() { renderAdventure(); }, 'handleEventNode');
}

/**
 * Обработка события из содержимого ноды
 * @param {Object} eventData
 */
async function handleEventFromContent(eventData) {
    await safeAsync((async function() {
        if (!eventData) return;
        if (window.UI && typeof window.UI.showModal === 'function') {
            var body = document.createElement('div');
            var text = document.createElement('div');
            text.textContent = eventData.description || eventData.name || eventData.id;
            text.style.textAlign = 'center';
            text.style.margin = '8px 0 10px 0';
            body.appendChild(text);
            var wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.justifyContent = 'center';
            wrap.style.gap = '10px';
            body.appendChild(wrap);
            var h = window.UI.showModal(body, { type: 'dialog', title: eventData.name || 'Событие', yesText: eventData.options && eventData.options[0] ? eventData.options[0].text : 'Ок', noText: eventData.options && eventData.options[1] ? eventData.options[1].text : 'Пропустить' });
            h.closed.then(async function(ok) {
                var opt = ok ? (eventData.options && eventData.options[0]) : (eventData.options && eventData.options[1]);
                await applyEffects(opt && opt.effects);
                renderAdventure();
            });
        }
    })(), undefined, 'handleEventFromContent');
}

async function handleRewardNode() {
    await safeAsync((async function() {
        var cfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('rewards') : null;
        var tables = (cfg && Array.isArray(cfg.tables)) ? cfg.tables : [];
        var t = tables[0] || null;
        if (t) await applyEffects(t.rewards);
    })(), undefined, 'handleRewardNode');
    renderAdventure();
}

/**
 * @param {Array} effects
 */
async function applyEffects(effects) {
    var arr = Array.isArray(effects) ? effects : [];
    for (var i = 0; i < arr.length; i++) {
        var e = arr[i];
        if (!e || !e.type) continue;
        if (e.type === 'currency') {
            adventureState.currencies = adventureState.currencies || {};
            adventureState.currencies[e.id] = (adventureState.currencies[e.id] || 0) + Number(e.amount || 0);
        } else if (e.type === 'rewardByTier') {
            await safeAsync((async function() {
                if (window.Rewards && typeof window.Rewards.grantByTier === 'function') await window.Rewards.grantByTier(Number(e.tier || 1));
            })(), undefined, 'applyEffects:rewardByTier');
        } else if (e.type === 'rewardById') {
            await safeAsync((async function() {
                if (window.Rewards && typeof window.Rewards.grantById === 'function') await window.Rewards.grantById(String(e.id || ''));
            })(), undefined, 'applyEffects:rewardById');
        }
    }
    persistAdventure();
}

/**
 * @param {Object} encData
 * @param {boolean} available
 */
async function onEncounterClick(encData, available) {
    var monsters = (window.StaticData && window.StaticData.getConfig) ? (function() { var m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
    var body = document.createElement('div');
    var desc = document.createElement('div');
    desc.style.marginBottom = '8px';
    desc.style.textAlign = 'center';
    desc.textContent = encData.description || '';
    body.appendChild(desc);
    (function() { var sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '8px 0'; body.appendChild(sep); })();
    var enemiesTitle = document.createElement('div');
    enemiesTitle.style.margin = '6px 0';
    enemiesTitle.style.color = '#cd853f';
    enemiesTitle.style.textAlign = 'center';
    enemiesTitle.textContent = 'Возможные противники';
    body.appendChild(enemiesTitle);
    var enemiesWrapTpl = document.getElementById('tpl-rewards-list');
    var enemiesWrap = enemiesWrapTpl ? enemiesWrapTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
    var enemiesItems = enemiesWrap.querySelector('[data-role="items"]') || enemiesWrap;
    var uniqEnemyIds = Array.from(new Set((encData.monsters || []).map(function(g) { return g && g.id; }).filter(Boolean)));
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
    var rewards = Array.isArray(encData.rewards) ? encData.rewards : [];
    if (rewards.length > 0) {
        var rewardsTitle = document.createElement('div');
        rewardsTitle.style.margin = '10px 0 6px 0';
        rewardsTitle.style.color = '#cd853f';
        rewardsTitle.style.textAlign = 'center';
        rewardsTitle.textContent = 'Возможные награды';
        body.appendChild(rewardsTitle);
        var rewardsWrapTpl = document.getElementById('tpl-rewards-list');
        var rewardsWrap = rewardsWrapTpl ? rewardsWrapTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        var rewardsItems = rewardsWrap.querySelector('[data-role="items"]') || rewardsWrap;
        var curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
        var curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
        var curById = {};
        curList.forEach(function(c) { curById[c.id] = c; });
        rewards.forEach(function(r) {
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
            } else if (r && r.type === 'monster') {
                var tplItem = document.getElementById('tpl-reward-unit');
                var el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
                if (!tplItem) el.className = 'reward-item';
                el.classList.add('clickable');
                var m = monsters[r.id] || { name: r.id, view: '👤' };
                var iconEl = el.querySelector('.reward-icon') || el;
                var nameEl = el.querySelector('.reward-name');
                if (iconEl) iconEl.textContent = m.view || '👤';
                if (nameEl) nameEl.textContent = m.name || r.id;
                el.addEventListener('click', function(e) { try { e.stopPropagation(); } catch(ex) {} showUnitInfoModal(r.id); });
                rewardsItems.appendChild(el);
            }
        });
        body.appendChild(rewardsWrap);
    }
    if (!available) {
        safeCall(function() {
            if (window.UI && window.UI.showModal) window.UI.showModal(body, { type: 'info', title: encData.id });
            else alert('Встреча недоступна');
        }, undefined, 'onEncounterClick:unavailable');
        return;
    }
    var accepted = false;
    await safeAsync((async function() {
        if (window.UI && typeof window.UI.showModal === 'function') {
            var h = window.UI.showModal(body, { type: 'dialog', title: encData.id, yesText: 'Бой', noText: 'Отмена' });
            accepted = await h.closed;
        } else {
            accepted = confirm('Начать встречу?');
        }
    })(), undefined, 'onEncounterClick:confirm');
    if (!accepted) return;
    startEncounterBattle(encData);
}

window.getEncountersIndex = getEncountersIndex;
window.getCurrentStage = getCurrentStage;
window.isEncounterDone = isEncounterDone;
window.getAvailableEncountersForCurrentStage = getAvailableEncountersForCurrentStage;
window.resolveGraphNode = resolveGraphNode;
window.handleEventNode = handleEventNode;
window.handleEventFromContent = handleEventFromContent;
window.handleRewardNode = handleRewardNode;
window.applyEffects = applyEffects;
window.onEncounterClick = onEncounterClick;

