/**
 * @fileoverview Основной модуль экрана приключения
 * Управляет отображением главного экрана и связывает компоненты
 */

(function(){
    'use strict';

async function showAdventure() {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('adventure');
        } else if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('adventure-screen', 'fragments/adventure-main.html');
            if (window.UI.ensureMenuBar) window.UI.ensureMenuBar('adventure-screen', { backLabel: 'Главная', back: window.backToIntroFromAdventure });
        }
    } catch {}
        
    try { if (window.Modifiers && typeof window.Modifiers.resetAndRecompute === 'function') window.Modifiers.resetAndRecompute(); } catch {}
        
        document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); s.style.display = 'none'; });
        var scr = document.getElementById('adventure-screen');
    if (scr) { scr.classList.add('active'); scr.style.display = 'flex'; }
        
        if (window.ensureAdventureTabs) window.ensureAdventureTabs();
        
    if (!window.AppState || !window.AppState.subscreen) {
        if (window.Router && window.Router.setSubscreen) window.Router.setSubscreen('map');
        else window.AppState = Object.assign(window.AppState || {}, { subscreen: 'map' });
    }
        
    renderAdventure();
}

function renderAdventure() {
        var adventureState = window.adventureState || {};
        
        var curWrap = document.getElementById('adventure-currencies');
    if (curWrap) {
        curWrap.innerHTML = '';
        try {
                var hostTop = document.getElementById('adventure-topbar');
            if (hostTop) {
                    var armyEl = document.getElementById('adventure-army-size');
                if (!armyEl) {
                    armyEl = document.createElement('div');
                    armyEl.id = 'adventure-army-size';
                    armyEl.style.display = 'flex';
                    armyEl.style.alignItems = 'center';
                    armyEl.style.gap = '6px';
                    armyEl.style.marginLeft = 'auto';
                    hostTop.insertBefore(armyEl, curWrap);
                }
                    var icon = '⚔️';
                    var max = (window.Hero && window.Hero.getArmyMax) ? window.Hero.getArmyMax() : 0;
                    var current = (window.Hero && window.Hero.getArmyCurrent) ? window.Hero.getArmyCurrent() : 0;
                    var assigned = (window.Raids && typeof window.Raids.getTotalAssignedUnits === 'function') ? window.Raids.getTotalAssignedUnits() : 0;
                    
                if (assigned > 0) {
                        armyEl.textContent = 'Армия: ' + current + '/' + max + ' ' + icon + ' (' + assigned + ' в рейдах)';
                } else {
                        armyEl.textContent = 'Армия: ' + current + '/' + max + ' ' + icon;
                    }
            }
        } catch {}
            
            var defs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
            var list = defs && Array.isArray(defs.currencies) ? defs.currencies : [];
            var byId = {}; list.forEach(function(c){ byId[c.id] = c; });
            var ids = Object.keys(adventureState.currencies || {});
            
        if (ids.length === 0) {
                var d = document.createElement('div'); d.textContent = '—'; curWrap.appendChild(d);
        } else {
            ids.forEach(function(id){
                    var def = byId[id] || { name: id, icon: '' };
                    var v = adventureState.currencies[id] || 0;
                    var el = document.createElement('div');
                el.style.fontSize = '1.05em';
                    el.textContent = def.name + ': ' + v + ' ' + (def.icon || '');
                curWrap.appendChild(el);
            });
        }
    }
        
        var nameEl = document.getElementById('adventure-name');
    if (nameEl) {
            var day = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
        nameEl.style.fontSize = '1.05em';
            nameEl.textContent = 'День: ' + day + ' ⏳';
        }
        
        if (window.ensureAdventureTabs) window.ensureAdventureTabs();
        try { var tabs = document.getElementById('adventure-tabs'); if (tabs && window.updateTabsActive) window.updateTabsActive(tabs); } catch {}
        
        if (window.renderAdventureSubscreen) window.renderAdventureSubscreen();
        
    if ((window.AppState && window.AppState.subscreen) === 'map' || !window.AppState || !window.AppState.subscreen) {
        setTimeout(function(){ if (window.renderThreatLevelIndicator) window.renderThreatLevelIndicator(); }, 100);
    }
}

async function showAdventureResult(message) {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('adventure-result');
        } else if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('adventure-result-screen', 'fragments/adventure-result.html');
            if (window.UI.ensureMenuBar) window.UI.ensureMenuBar('adventure-result-screen', { backLabel: 'Главная', back: window.showIntro });
        }
    } catch {}
        
        document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); s.style.display = 'none'; });
        var scr = document.getElementById('adventure-result-screen');
        var msg = document.getElementById('adventure-result-message');
    if (msg) msg.textContent = message;
    if (scr) { scr.classList.add('active'); scr.style.display = 'flex'; }
}

    // Экспорт функций
    window.showAdventure = showAdventure;
window.renderAdventure = renderAdventure;
window.showAdventureResult = showAdventureResult;

    // Инициализация переменных для рейдов (если не были инициализированы)
    if (typeof window._raidBattleResult === 'undefined') window._raidBattleResult = null;

})();
