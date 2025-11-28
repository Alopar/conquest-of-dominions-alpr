(function(){
    'use strict';

    var adventureUserLoaded = false;

    async function showAdventureSetup() {
        try {
            if (window.Router && typeof window.Router.setScreen === 'function') {
                await window.Router.setScreen('adventure-setup');
            } else if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
                await window.UI.ensureScreenLoaded('adventure-setup-screen', 'fragments/adventure-setup.html');
                if (window.UI.ensureMenuBar) window.UI.ensureMenuBar('adventure-setup-screen', { backLabel: 'Главная', back: window.backToIntroFromAdventure });
            }
        } catch {}
        
        document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); s.style.display = 'none'; });
        var scr = document.getElementById('adventure-setup-screen');
        if (scr) { scr.classList.add('active'); scr.style.display = 'flex'; }
        
        try {
            var host = document.getElementById('adventure-config-panel');
            if (host) { host.innerHTML = ''; host.style.display = 'none'; }
            if (window.adventureState) window.adventureState.selectedClassId = null;
        } catch {}
        
        try { localStorage.removeItem('adventureState'); } catch {}
        
        var newState = { 
            config: null, 
            currencies: {}, 
            pool: {}, 
            selectedClassId: null, 
            currentStageIndex: 0, 
            completedEncounterIds: [], 
            inBattle: false, 
            lastResult: '', 
            nodeContents: {}, 
            currentNodeContent: [], 
            sectorStartDay: null, 
            sectorThreatLevel: 0 
        };
        window.adventureState = newState;
        
        if (window.restoreAdventure) window.restoreAdventure();
        
        if (window.adventureState && window.adventureState.config) {
            var cfg = window.adventureState.config;
            var statusDiv = document.getElementById('adventure-file-status') || (document.querySelector('#adventure-config-panel [data-role="status"]'));
            var d = cfg.adventure && cfg.adventure.description ? ' - ' + cfg.adventure.description : '';
            if (statusDiv) { 
                statusDiv.textContent = '✅ Загружено приключение: "' + cfg.adventure.name + '"' + d; 
                statusDiv.className = 'file-status success'; 
            }
            renderHeroClassSelectionSetup();
            var btn = document.getElementById('adventure-begin-btn'); 
            if (btn) btn.disabled = true;
        }
        
        if (!adventureUserLoaded) {
            loadDefaultAdventure();
        }
    }

    async function backToIntroFromAdventure() {
        var proceed = true;
        try {
            if (window.UI && typeof window.UI.showModal === 'function') {
                var h = window.UI.showModal('Игровой прогресс будет потерян. Выйти на главную?', { type: 'dialog', title: 'Подтверждение', yesText: 'Да', noText: 'Отмена' });
                proceed = await h.closed;
            } else {
                proceed = confirm('Игровой прогресс будет потерян. Выйти на главную?');
            }
        } catch {}
        if (!proceed) return;
        try {
            if (window.Router && typeof window.Router.setScreen === 'function') {
                window.Router.setScreen('intro');
            } else {
                if (window.showScreen) window.showScreen('intro-screen');
            }
        } catch { if (window.showScreen) window.showScreen('intro-screen'); }
    }

    async function loadAdventureFile(file) {
        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var cfg = JSON.parse(e.target.result);
                if (window.validateAdventureConfig) window.validateAdventureConfig(cfg);
                try {
                    if (window.StaticData && typeof window.StaticData.setUserConfig === 'function') {
                        window.StaticData.setUserConfig('adventure', cfg);
                        if (typeof window.StaticData.setUseUser === 'function') window.StaticData.setUseUser('adventure', true);
                    }
                } catch {}
                if (window.initAdventureState) window.initAdventureState(cfg);
                var statusDiv = document.getElementById('adventure-file-status') || (document.querySelector('#adventure-config-panel [data-role="status"]'));
                var d = cfg.adventure && cfg.adventure.description ? ' - ' + cfg.adventure.description : '';
                if (statusDiv) { 
                    statusDiv.textContent = '✅ Загружено приключение: "' + cfg.adventure.name + '"' + d; 
                    statusDiv.className = 'file-status success'; 
                }
                renderHeroClassSelectionSetup();
                updateBeginAdventureButtonState();
                adventureUserLoaded = true;
            } catch (err) {
                var statusDiv = document.getElementById('adventure-file-status');
                if (statusDiv) { 
                    statusDiv.textContent = '❌ Ошибка загрузки: ' + err.message; 
                    statusDiv.className = 'file-status error'; 
                }
            }
        };
        reader.onerror = function() {
            var statusDiv = document.getElementById('adventure-file-status') || (document.querySelector('#adventure-config-panel [data-role="status"]'));
            if (statusDiv) { 
                statusDiv.textContent = '❌ Ошибка чтения файла'; 
                statusDiv.className = 'file-status error'; 
            }
        };
        reader.readAsText(file);
    }

    async function loadDefaultAdventure() {
        try {
            var cfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('adventure') : null;
            if (window.validateAdventureConfig) window.validateAdventureConfig(cfg);
            if (window.initAdventureState) window.initAdventureState(cfg);
            var statusDiv = document.getElementById('adventure-file-status') || (document.querySelector('#adventure-config-panel [data-role="status"]'));
            var d = cfg.adventure && cfg.adventure.description ? ' - ' + cfg.adventure.description : '';
            if (statusDiv) { 
                statusDiv.textContent = '✅ Загружено приключение: "' + cfg.adventure.name + '"' + d; 
                statusDiv.className = 'file-status success'; 
            }
            renderHeroClassSelectionSetup();
            var btn = document.getElementById('adventure-begin-btn'); 
            if (btn) btn.disabled = true;
        } catch (err) {
            var statusDiv = document.getElementById('adventure-file-status');
            if (statusDiv) { 
                statusDiv.textContent = '❌ Ошибка загрузки стандартного приключения: ' + err.message; 
                statusDiv.className = 'file-status error'; 
            }
        }
    }

    function renderHeroClassSelectionSetup() {
        var cont = document.getElementById('hero-class-select');
        if (!cont) return;
        cont.innerHTML = '';
        
        var wrapper = document.createElement('div');
        wrapper.className = 'hero-class-list';
        
        var classesCfg = null;
        try {
            classesCfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('heroClasses') : null;
        } catch {}
        
        var list = classesCfg && Array.isArray(classesCfg.classes) ? classesCfg.classes : (Array.isArray(classesCfg) ? classesCfg : []);
        
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            
            var el = window.UI.renderTemplate('tpl-hero-class-item', {
                slots: {
                    icon: c.icon || '❓',
                    name: c.name || c.id
                }
            });
            
            if (!el) continue;
            
            el.dataset.id = c.id;
            
            var requiredAchId = c.requiresAchievementId;
            var isLocked = false;
            if (requiredAchId) {
                try {
                    var a = (window.Achievements && typeof window.Achievements.getById === 'function') ? window.Achievements.getById(requiredAchId) : null;
                    isLocked = !(a && a.achieved);
                } catch { isLocked = true; }
            }
            if (isLocked) el.classList.add('locked');
            
            (function(classData, locked){
                el.addEventListener('click', function(){ onHeroClassClick(classData, locked); });
            })(c, isLocked);
            
            var adventureState = window.adventureState || {};
            if (adventureState.selectedClassId === c.id) el.classList.add('selected');
            wrapper.appendChild(el);
        }
        cont.appendChild(wrapper);
    }

    async function onHeroClassClick(c, isLocked) {
        var body = document.createElement('div');
        
        var desc = window.UI.renderTemplate('tpl-modal-section', {
            slots: { text: c.description || '' }
        });
        if (desc) body.appendChild(desc);
        
        var sep1 = window.UI.renderTemplate('tpl-modal-divider');
        if (sep1) body.appendChild(sep1);
        
        var armyTitle = window.UI.renderTemplate('tpl-section-title', {
            slots: { text: 'Начальная армия' }
        });
        if (armyTitle) body.appendChild(armyTitle);
        
        if (Array.isArray(c.startingArmy) && c.startingArmy.length > 0) {
            var monsters = (window.StaticData && window.StaticData.getConfig) ? (function(){ var m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
            
            var wrap = window.UI.renderTemplate('tpl-rewards-list');
            var items = wrap ? (wrap.querySelector('[data-role="items"]') || wrap) : document.createElement('div');
            
            if (!wrap) items.style.cssText = 'display:flex; flex-wrap:wrap; justify-content:center; gap:12px;';
            
            for (var i = 0; i < c.startingArmy.length; i++) {
                var g = c.startingArmy[i];
                var m = monsters[g.id] || { name: g.id, view: '👤' };
                
                var el = window.UI.renderTemplate('tpl-reward-unit', {
                    slots: {
                        icon: m.view || '👤',
                        name: (m.name || g.id) + ' x' + g.count
                    }
                });
                
                if (!el) continue;
                
                el.classList.add('clickable');
                (function(unitId){
                    el.addEventListener('click', function(e){ 
                        try { e.stopPropagation(); } catch {} 
                        if (window.showUnitInfoModal) window.showUnitInfoModal(unitId); 
                    });
                })(g.id);
                
                items.appendChild(el);
            }
            if (wrap) body.appendChild(wrap); else body.appendChild(items);
        }
        
        if (isLocked) {
            var sep2 = window.UI.renderTemplate('tpl-modal-divider');
            if (sep2) body.appendChild(sep2);
            
            var reqTitle = window.UI.renderTemplate('tpl-section-title', {
                slots: { text: 'Требуется достижение' }
            });
            if (reqTitle) body.appendChild(reqTitle);
            
            var achIcon = '🏆';
            var achName = c.requiresAchievementId || '';
            try {
                var ach = (window.Achievements && typeof window.Achievements.getById === 'function') ? window.Achievements.getById(c.requiresAchievementId) : null;
                if (ach) {
                    achIcon = ach.icon || '🏆';
                    achName = ach.name || achName;
                }
            } catch {}
            
            var row = window.UI.renderTemplate('tpl-icon-row', {
                slots: {
                    icon: achIcon,
                    text: achName
                }
            });
            if (row) body.appendChild(row);
            
            try {
                if (window.UI && typeof window.UI.showModal === 'function') {
                    var title = ((c.icon || '') + ' ' + (c.name || c.id)).trim();
                    await window.UI.showModal(body, { type: 'info', title: title }).closed;
                } else { alert('Класс недоступен'); }
            } catch {}
            return;
        }
        
        var accepted = false;
        try {
            if (window.UI && typeof window.UI.showModal === 'function') {
                var title = ((c.icon || '') + ' ' + (c.name || c.id)).trim();
                var h = window.UI.showModal(body, { type: 'dialog', title: title, yesText: 'Выбрать', noText: 'Закрыть' });
                accepted = await h.closed;
            } else { accepted = confirm('Выбрать класс ' + (c.name || c.id) + '?'); }
        } catch {}
        if (!accepted) return;
        
        try { if (window.Hero && typeof window.Hero.setClassId === 'function') window.Hero.setClassId(c.id); } catch {}
        
        var adventureState = window.adventureState || {};
        adventureState.selectedClassId = c.id;
        adventureState.pool = {};
        
        var startArmy = (window.Hero && typeof window.Hero.getStartingArmy === 'function') ? window.Hero.getStartingArmy() : [];
        for (var j = 0; j < startArmy.length; j++) {
            var unit = startArmy[j];
            if (unit && unit.id && unit.count > 0) {
                adventureState.pool[unit.id] = (adventureState.pool[unit.id] || 0) + unit.count;
            }
        }
        
        if (window.persistAdventure) window.persistAdventure();
        
        var btn = document.getElementById('adventure-begin-btn'); 
        if (btn) btn.disabled = false;
        
        var listRoot = document.getElementById('hero-class-select');
        if (listRoot) {
            listRoot.querySelectorAll('.hero-class-item').forEach(function(node){
                node.classList.toggle('selected', node.dataset.id === c.id);
            });
        }
    }

    function updateBeginAdventureButtonState() {
        var btn = document.getElementById('adventure-begin-btn');
        if (!btn) return;
        var adventureState = window.adventureState || {};
        btn.disabled = !adventureState.selectedClassId;
    }

    window.showAdventureSetup = showAdventureSetup;
    window.backToIntroFromAdventure = backToIntroFromAdventure;
    window.loadAdventureFile = loadAdventureFile;
    window.loadDefaultAdventure = loadDefaultAdventure;
    window.renderHeroClassSelectionSetup = renderHeroClassSelectionSetup;
    window.onHeroClassClick = onHeroClassClick;
    window.updateBeginAdventureButtonState = updateBeginAdventureButtonState;
})();
