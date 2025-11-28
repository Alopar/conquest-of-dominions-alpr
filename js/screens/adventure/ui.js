/**
 * @fileoverview Модуль UI рендеринга для приключения
 */

/**
 * @returns {number}
 */
function getAdventureMoveDurationMs() {
    return safeCall(function() {
        var settings = (window.GameSettings && typeof window.GameSettings.get === 'function') ? window.GameSettings.get() : null;
        var seconds = settings && typeof settings.adventureMoveDuration === 'number' ? settings.adventureMoveDuration : 5;
        return Math.max(100, seconds * 1000);
    }, 5000, 'getAdventureMoveDurationMs');
}

function renderModsDebug() {
    var host = document.getElementById('mods-debug-table');
    if (!host) return;
    host.innerHTML = '';
    var snap = (window.Modifiers && typeof window.Modifiers.getSnapshot === 'function') ? window.Modifiers.getSnapshot() : { activeEffects: [] };
    var effects = Array.isArray(snap.activeEffects) ? snap.activeEffects : [];
    
    var filtered = effects.filter(function(e) { return e && (e.side === 'attackers' || e.side === 'adventure') && e.value !== 0; });
    
    if (filtered.length === 0) {
        host.textContent = 'Нет активных модификаторов';
        return;
    }

    var tbl = window.UI.renderTemplate('tpl-mods-debug-table');
    if (!tbl) return;
    var tbody = tbl.querySelector('[data-role="body"]');
    if (!tbody) return;

    filtered.forEach(function(e) {
        var row = window.UI.renderTemplate('tpl-mods-debug-row', {
            slots: {
                type: e.type || '',
                path: e.path || '',
                value: String(e.value || 0)
            }
        });
        if (row) tbody.appendChild(row);
    });
    
    host.appendChild(tbl);
}

function renderPool() {
    var container = document.getElementById('adventure-pool');
    if (!container) return;
    container.innerHTML = '';

    var unitTypes = window.battleConfig && window.battleConfig.unitTypes ? window.battleConfig.unitTypes : null;
    var monsters = unitTypes || {};
    var ids = Object.keys(adventureState.pool).filter(function(k) { return adventureState.pool[k] > 0; });
    
    if (ids.length === 0) { container.innerHTML = '<div>Пул пуст</div>'; return; }

    var tbl = window.UI.renderTemplate('tpl-pool-table');
    if (!tbl) return;
    var tbody = tbl.querySelector('[data-role="body"]');
    
    if (!tbody) return;

    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var m = monsters[id] || { name: id, view: '❓' };
        
        var row = window.UI.renderTemplate('tpl-pool-row', {
            slots: {
                icon: m.view || '❓',
                name: m.name || id,
                id: id,
                count: adventureState.pool[id]
            }
        });
        if (row) tbody.appendChild(row);
    }
    container.appendChild(tbl);
}

/**
 * @param {string} typeId
 * @returns {Array}
 */
function priceFor(typeId) {
    var list = null;
    try {
        var m = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('mercenaries') : null;
        list = Array.isArray(m) ? m : (m && Array.isArray(m.mercenaries) ? m.mercenaries : null);
    } catch(e) {}
    if (!list) return [{ id: 'gold', amount: 10 }];
    var found = list.find(function(m) { return m.id === typeId; });
    var arr = (found && Array.isArray(found.price)) ? found.price : [{ id: 'gold', amount: 10 }];
    return arr;
}

function renderTavern() {
    var hostAvail = document.getElementById('tavern-available-list');
    var hostArmy = document.getElementById('tavern-army-list');
    if (hostAvail) hostAvail.innerHTML = '';
    if (hostArmy) hostArmy.innerHTML = '';
    
    var monsters = window.battleConfig && window.battleConfig.unitTypes ? window.battleConfig.unitTypes : {};
    var list = [];
    try {
        var m = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('mercenaries') : null;
        list = Array.isArray(m) ? m : (m && Array.isArray(m.mercenaries) ? m.mercenaries : []);
    } catch(e) { list = []; }
    
    if (hostAvail) {
        var curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
        var curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
        var curById = {};
        curList.forEach(function(c) { curById[c.id] = c; });
        var clsId = (window.Hero && window.Hero.getClassId && window.Hero.getClassId()) || null;
        
        var visible = list.filter(function(item) {
            var t = Number(item.tier || 0);
            var tierOk = true;
            try { if (window.Modifiers && typeof window.Modifiers.hasMercTier === 'function') { tierOk = t <= 0 ? true : window.Modifiers.hasMercTier(t); } } catch(e) {}
            var classOk = true;
            if (Array.isArray(item.classes) && item.classes.length > 0 && clsId) classOk = item.classes.includes(clsId);
            return tierOk && classOk;
        });
        
        for (var i = 0; i < visible.length; i++) {
            var item = visible[i];
            var m = monsters[item.id] || { id: item.id, name: item.id, view: '❓' };
            var price = priceFor(item.id);
            var canBuy = price.every(function(p) { return (adventureState.currencies[p.id] || 0) >= p.amount; });
            
            var priceText = price.map(function(p) { var cd = curById[p.id] || { icon: '', name: p.id }; return p.amount + ' ' + (cd.icon || ''); }).join(' ');

            var card = window.UI.renderTemplate('tpl-tavern-item', {
                slots: { price: priceText },
                handlers: { buy: (function(itemId) { return function() { buyUnit(itemId); }; })(item.id) }
            });
            
            if (!card) continue;

            var btn = card.querySelector('[data-action="buy"]');
            if (btn) btn.disabled = !canBuy;

            // Создаем превью юнита
            var tplItem = document.getElementById('tpl-reward-unit');
            var el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
            if (!tplItem) el.className = 'reward-item';
            
            var iconEl = el.querySelector('.reward-icon') || el;
            var nameEl = el.querySelector('.reward-name');
            if (iconEl) iconEl.textContent = m.view || '👤';
            if (nameEl) nameEl.textContent = m.name || item.id;
            el.classList.add('clickable');
            
            (function(itemId) {
                el.addEventListener('click', function() { showUnitInfoModal(itemId); });
            })(item.id);
            
            var previewSlot = card.querySelector('[data-role="preview"]');
            if (previewSlot) previewSlot.appendChild(el);

            hostAvail.appendChild(card);
        }
    }
    
    if (hostArmy) {
        var assigned = (window.Raids && typeof window.Raids.getAssignedUnitsByType === 'function') ? window.Raids.getAssignedUnitsByType() : {};
        var ids = Object.keys(adventureState.pool).filter(function(k) { return adventureState.pool[k] > 0; });
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            var total = adventureState.pool[id];
            var inRaids = Number(assigned[id] || 0);
            var available = Math.max(0, total - inRaids);
            if (available <= 0) continue;
            
            var tplItem = document.getElementById('tpl-reward-unit');
            var el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
            if (!tplItem) el.className = 'reward-item';
            
            var m = monsters[id] || { name: id, view: '👤' };
            var iconEl = el.querySelector('.reward-icon') || el;
            var nameEl = el.querySelector('.reward-name');
            if (iconEl) iconEl.textContent = m.view || '👤';
            if (nameEl) nameEl.textContent = (m.name || id) + ' x' + available;
            
            el.classList.add('clickable');
            (function(uid) {
                el.addEventListener('click', function() { showUnitInfoModal(uid); });
            })(id);
            
            hostArmy.appendChild(el);
        }
    }
}

/**
 * @param {string} typeId
 */
function buyUnit(typeId) {
    var price = priceFor(typeId);
    var canBuy = price.every(function(p) { return (adventureState.currencies[p.id] || 0) >= p.amount; });
    if (!canBuy) return;
    for (var i = 0; i < price.length; i++) {
        var p = price[i];
        adventureState.currencies[p.id] = (adventureState.currencies[p.id] || 0) - p.amount;
    }
    adventureState.pool[typeId] = (adventureState.pool[typeId] || 0) + 1;
    persistAdventure();
    renderAdventure();
}

function updateBeginAdventureButtonState() {
    var btn = document.getElementById('adventure-begin-btn');
    if (!btn) return;
    btn.disabled = !adventureState.selectedClassId;
}

function renderBeginButtonOnMain() {}

/**
 * @param {string} unitTypeId
 */
function showUnitInfoModal(unitTypeId) {
    safeCall(function() {
        var monsters = (window.StaticData && window.StaticData.getConfig) ? (function() { var m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
        var t = monsters[unitTypeId] || { id: unitTypeId, name: unitTypeId, view: '👤', type: '', hp: 0, damage: 0, targets: 1 };
        
        var role = (function() { var v = (t && t.type ? String(t.type).toLowerCase() : 'melee'); return (v === 'range' || v === 'support') ? v : 'melee'; })();
        var hpBonus = (window.Modifiers && window.Modifiers.getHpBonus) ? window.Modifiers.getHpBonus('attackers', role) : 0;
        var hpExtra = Number(hpBonus || 0);
        var hpText = hpExtra > 0 ? 'НР: ' + t.hp + ' (+' + hpExtra + ') ❤️' : 'НР: ' + t.hp + ' ❤️';
        
        var dmgBonus = (window.Modifiers && window.Modifiers.getDamageBonus) ? window.Modifiers.getDamageBonus('attackers', role) : 0;
        var dmgText = '';
        if (Number(dmgBonus || 0) > 0) {
            dmgText = 'УРОН: ' + t.damage + ' (+' + dmgBonus + ')💥';
        } else {
            dmgText = 'УРОН: ' + t.damage + '💥';
        }
        
        var targetsBonus = (window.Modifiers && window.Modifiers.getTargetsBonus) ? Number(window.Modifiers.getTargetsBonus('attackers', role) || 0) : 0;
        var baseTargets = Number(t.targets || 1);
        var targetsText = targetsBonus > 0 ? 'ЦЕЛИ: ' + baseTargets + ' (+' + targetsBonus + ') 🎯' : 'ЦЕЛИ: ' + baseTargets + ' 🎯';

        var body = window.UI.renderTemplate('tpl-unit-modal-body', {
            slots: {
                iconName: (t.view || '👤') + ' ' + (t.name || unitTypeId),
                type: 'ТИП: ' + String(t.type || ''),
                hp: hpText,
                damage: dmgText,
                targets: targetsText
            }
        });

        if (window.UI && typeof window.UI.showModal === 'function') window.UI.showModal(body, { type: 'info', title: 'Описание существа' });
    }, undefined, 'showUnitInfoModal');
}

function renderNodeContentItems() {
    var container = document.getElementById('adventure-node-content-area');
    if (!container) return;
    container.innerHTML = '';
    var contents = Array.isArray(adventureState.currentNodeContent) ? adventureState.currentNodeContent : [];
    if (contents.length === 0) return;
    
    contents.forEach(function(item, index) {
        var icon = '✨';
        var name = 'Энкаунтер';
        
        if (item.type === 'event') {
            var ev = item.data;
            icon = ev.icon || '✨';
            name = item.data.name || item.data.id || 'Событие';
        } else if (item.type === 'encounter') {
            var enc = item.data;
            icon = enc.icon || (enc.class === 'boss' ? '👑' : enc.class === 'elite' ? '💀' : '😡');
            name = item.data.name || item.data.id || 'Энкаунтер';
        } else if (item.type === 'raid') {
            var raid = item.data;
            icon = raid.icon || '⚔️';
            name = item.data.name || item.data.id || 'Рейд';
        }

        var el = window.UI.renderTemplate('tpl-node-content-item', {
            slots: { icon: icon }
        });
        
        if (!el) return;
        
        el.setAttribute('data-index', String(index));
        el.style.cursor = 'pointer';
        el.addEventListener('click', function() {
            showContentItemModal(item, index);
        });
        
        container.appendChild(el);
    });
}

window.getAdventureMoveDurationMs = getAdventureMoveDurationMs;
window.renderModsDebug = renderModsDebug;
window.renderPool = renderPool;
window.priceFor = priceFor;
window.renderTavern = renderTavern;
window.buyUnit = buyUnit;
window.updateBeginAdventureButtonState = updateBeginAdventureButtonState;
window.renderBeginButtonOnMain = renderBeginButtonOnMain;
window.showUnitInfoModal = showUnitInfoModal;
window.renderNodeContentItems = renderNodeContentItems;
