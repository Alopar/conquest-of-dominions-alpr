(function(){
    'use strict';

    function ensureAdventureTabs() {
        var screen = document.getElementById('adventure-screen');
        if (!screen) return;
        var tabs = screen.querySelector('#adventure-tabs');
        var isDebugMode = false;
        try { 
            var settings = window.GameSettings && window.GameSettings.get ? window.GameSettings.get() : {};
            isDebugMode = !!(settings.uiSettings && settings.uiSettings.debugMode);
        } catch (e) {}
        if (tabs) {
            var hasModsBtn = !!tabs.querySelector('button[data-subscreen="mods"]');
            if (hasModsBtn === isDebugMode) {
                updateTabsActive(tabs);
                return;
            }
            tabs.remove();
            tabs = null;
        }
        var content = screen.querySelector('.settings-content');
        if (!content) return;
        tabs = document.createElement('div');
        tabs.id = 'adventure-tabs';
        tabs.className = 'adventure-tabs';
        tabs.setAttribute('role', 'tablist');
        
        var makeBtn = function(key, label){
            var b = document.createElement('button');
            b.className = 'btn secondary-btn';
            b.dataset.subscreen = key;
            b.textContent = label;
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', 'false');
            b.addEventListener('keydown', function(e){
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    var all = Array.from(tabs.querySelectorAll('button[role="tab"]'));
                    var idx = all.indexOf(b);
                    var nextIdx = e.key === 'ArrowRight' ? (idx + 1) % all.length : (idx - 1 + all.length) % all.length;
                    var next = all[nextIdx];
                    if (next) { next.focus(); next.click(); }
                }
            });
            b.addEventListener('click', async function(){ 
                if (window.Router && window.Router.setSubscreen) window.Router.setSubscreen(key); 
                else window.AppState = Object.assign(window.AppState||{}, { subscreen: key }); 
                await renderAdventureSubscreen(); 
                updateTabsActive(tabs); 
            });
            return b;
        };
        
        tabs.appendChild(makeBtn('map', '🗺️ Карта'));
        tabs.appendChild(makeBtn('raids', '⚔️ Рейды'));
        tabs.appendChild(makeBtn('tavern', '🍻 Таверна'));
        
        var devMode = 'shop';
        try { devMode = ((window.GameSettings && window.GameSettings.get && window.GameSettings.get().development && window.GameSettings.get().development.mode) || 'shop'); } catch {}
        var heroLabel = devMode === 'tracks' ? '📊 Улучшения' : '💪 Улучшения';
        tabs.appendChild(makeBtn('hero', heroLabel));
        tabs.appendChild(makeBtn('perks', '🥇 Перки'));
        if (isDebugMode) {
            tabs.appendChild(makeBtn('mods', '🔧 MODS'));
        }
        content.insertBefore(tabs, content.firstElementChild || null);
        updateTabsActive(tabs);
    }

    function updateTabsActive(tabs) {
        var current = (window.AppState && window.AppState.subscreen) || 'map';
        tabs.querySelectorAll('button[data-subscreen]').forEach(function(btn){
            var isActive = btn.dataset.subscreen === current;
            btn.className = isActive ? 'btn tab-selected' : 'btn secondary-btn';
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    async function loadAdventureSubscreen(key) {
        var cont = document.getElementById('adventure-subcontainer');
        if (!cont) return;
        var map = { 
            map: 'fragments/adventure-sub-map.html', 
            tavern: 'fragments/adventure-sub-tavern.html', 
            raids: 'fragments/adventure-sub-raids.html', 
            army: 'fragments/adventure-sub-army.html', 
            hero: 'fragments/adventure-sub-hero.html', 
            perks: 'fragments/adventure-sub-perks.html', 
            mods: 'fragments/adventure-sub-mods.html' 
        };
        var url = map[key] || map.map;
        try {
            var res = await fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var html = await res.text();
            cont.innerHTML = html;
            try { if (window.UI && typeof window.UI.clearTooltips === 'function') window.UI.clearTooltips(); } catch {}
        } catch (e) { cont.innerHTML = '<div class="settings-section">Не удалось загрузить раздел</div>'; }
    }

    async function renderAdventureSubscreen() {
        var subscreen = (window.AppState && window.AppState.subscreen) || 'map';
        await loadAdventureSubscreen(subscreen);
        
        if (subscreen === 'army') {
            if (window.renderPool) window.renderPool();
        } else if (subscreen === 'map') {
            if (window.renderMapBoard) window.renderMapBoard();
            setTimeout(function(){ if (window.renderThreatLevelIndicator) window.renderThreatLevelIndicator(); }, 50);
        } else if (subscreen === 'tavern') {
            if (window.renderTavern) window.renderTavern();
        } else if (subscreen === 'hero') {
            renderHeroDevelopment();
        } else if (subscreen === 'raids') {
            if (window.renderRaids) window.renderRaids();
        } else if (subscreen === 'perks') {
            renderPerksSubscreen();
        } else if (subscreen === 'mods') {
            try { if (window.Modifiers && typeof window.Modifiers.recompute === 'function') window.Modifiers.recompute(); } catch {}
            if (window.renderModsDebug) window.renderModsDebug();
        }
    }

    function renderPerksSubscreen() {
        try {
            var host = document.getElementById('perks-grid');
            if (host) {
                host.innerHTML = '';
                var items = [];
                try { items = (window.Perks && typeof window.Perks.getPublicOwned === 'function') ? window.Perks.getPublicOwned() : []; } catch { items = []; }
                items.forEach(function(p){
                    var tpl = document.getElementById('tpl-perk-item');
                    var el = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                    if (!tpl) { el.className = 'achievement-card clickable'; }
                    var iconEl = el.querySelector('.achievement-icon') || el;
                    var nameEl = el.querySelector('.achievement-name');
                    if (iconEl) iconEl.textContent = p.icon || '🥈';
                    if (nameEl) nameEl.textContent = p.name || p.id;
                    el.addEventListener('click', function(){
                        try {
                            if (!(window.UI && typeof window.UI.showModal === 'function')) return;
                            var bodyTpl = document.getElementById('tpl-perk-modal-body');
                            var body = bodyTpl ? bodyTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                            var descEl = body.querySelector('[data-role="desc"]') || body;
                            if (descEl) descEl.textContent = p.description || '';
                            window.UI.showModal(body, { type: 'info', title: ((p.icon || '') + ' ' + (p.name || p.id)).trim() });
                        } catch {}
                    });
                    host.appendChild(el);
                });
            }
        } catch {}
    }

    function renderHeroDevelopment() {
        var rootHost = document.getElementById('hero-dev-root');
        if (!rootHost) return;
        rootHost.innerHTML = '';
        
        var devMode = 'shop';
        try { devMode = ((window.GameSettings && window.GameSettings.get && window.GameSettings.get().development && window.GameSettings.get().development.mode) || 'shop'); } catch {}
        
        if (devMode === 'tracks') {
            renderTracksMode(rootHost);
            return;
        }
        
        renderShopMode(rootHost);
    }

    function renderTracksMode(rootHost) {
        var scrTpl = document.getElementById('tpl-dev-tracks-screen');
        var rowTpl = document.getElementById('tpl-dev-track-row');
        var itemTpl = document.getElementById('tpl-dev-track-item');
        var scr = scrTpl ? scrTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        var list = scr.querySelector('#dev-tracks-list') || scr;
        
        try { 
            if (window.Tracks && typeof window.Tracks.initForClass === 'function') 
                window.Tracks.initForClass((window.Hero && window.Hero.getClassId && window.Hero.getClassId()) || null); 
        } catch {}
        
        var tracks = (window.Tracks && typeof window.Tracks.getAvailableTracks === 'function') ? window.Tracks.getAvailableTracks() : [];
        
        tracks.forEach(function(t){
            var row = rowTpl ? rowTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
            if (!rowTpl) row.className = 'dev-track-row';
            var iconEl = row.querySelector('[data-role="icon"]') || row;
            var nameEl = row.querySelector('[data-role="name"]');
            var progEl = row.querySelector('[data-role="progress"]') || row;
            var b1 = row.querySelector('[data-role="invest1"]');
            if (iconEl) iconEl.textContent = t.icon || '📊';
            if (nameEl) nameEl.textContent = t.name || t.id;
            
            var cur = (window.Tracks && window.Tracks.getProgress) ? window.Tracks.getProgress(t.id) : 0;
            var maxVal = (Array.isArray(t.thresholds) && t.thresholds.length>0) ? t.thresholds[t.thresholds.length-1].value : cur + 10;
            var cells = Math.max(cur, maxVal);
            progEl.innerHTML = '';
            
            for (var i=1; i<=cells; i++){
                var it = itemTpl ? itemTpl.content.firstElementChild.cloneNode(true) : document.createElement('span');
                if (!itemTpl) { it.className = 'dev-track-item'; }
                var isThreshold = Array.isArray(t.thresholds) && t.thresholds.some(function(th){ return th && th.value === i; });
                if (i <= cur) it.classList.add('filled');
                if (isThreshold) {
                    it.classList.add('threshold');
                    attachThresholdTooltip(it, t, i);
                }
                progEl.appendChild(it);
            }
            
            wireTrackButton(b1, t);
            list.appendChild(row);
        });
        rootHost.appendChild(scr);
    }

    function attachThresholdTooltip(it, track, cellIndex) {
        try {
            if (window.UI && typeof window.UI.attachTooltip === 'function') {
                window.UI.attachTooltip(it, function(){
                    var cfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('perks') : null;
                    var list = cfg && Array.isArray(cfg.perks) ? cfg.perks : [];
                    var byId = {}; list.forEach(function(p){ byId[p.id] = p; });
                    var th = (track.thresholds || []).find(function(x){ return x && x.value === cellIndex; }) || { grantsPerks: [] };
                    var perks = Array.isArray(th.grantsPerks) ? th.grantsPerks : [];
                    var wrap = document.createElement('div');
                    perks.forEach(function(pid){
                        var p = byId[pid] || { id: pid, name: pid, icon: '🥇' };
                        var row = document.createElement('div');
                        row.textContent = (p.icon || '🥇') + ' ' + (p.name || pid);
                        wrap.appendChild(row);
                    });
                    return wrap;
                }, { delay: 200 });
            }
        } catch {}
    }

    function wireTrackButton(btn, track) {
        if (!btn) return;
        try {
            var ch = window.Tracks && window.Tracks.canInvest ? window.Tracks.canInvest(track.id, 1) : { ok:false };
            btn.disabled = !(ch && ch.ok);
            var c = (window.StaticData && window.StaticData.getConfig && window.StaticData.getConfig('currencies'));
            var list = c && Array.isArray(c.currencies) ? c.currencies : [];
            var byId = {}; list.forEach(function(cc){ byId[cc.id] = cc; });
            var cd = byId[track.currencyId] || { icon:'', name:track.currencyId };
            btn.textContent = track.unitCost + ' ' + (cd.icon || '');
            btn.addEventListener('click', function(){ 
                if (window.Tracks && window.Tracks.invest && window.Tracks.invest(track.id, 1)) {
                    if (window.renderAdventure) window.renderAdventure();
                }
            });
        } catch { btn.textContent = ''; }
    }

    function renderShopMode(rootHost) {
        var scrTpl = document.getElementById('tpl-hero-dev-screen');
        var headerTpl = document.getElementById('tpl-hero-dev-header');
        var rowTpl = document.getElementById('tpl-hero-dev-row');
        var upTpl = document.getElementById('tpl-upgrade-item');
        
        var curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
        var curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
        var curById = {}; curList.forEach(function(c){ curById[c.id] = c; });
        
        var levels = (window.Development && window.Development.getLevelDefs && window.Development.getLevelDefs()) || [];
        var purchasedLvl = (window.Development && window.Development.getCurrentLevel && window.Development.getCurrentLevel()) || 0;
        
        var upgradesCfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('heroUpgrades') : null;
        var upgradesList = upgradesCfg && Array.isArray(upgradesCfg.upgrades) ? upgradesCfg.upgrades : [];
        var upById = {}; upgradesList.forEach(function(u){ upById[u.id] = u; });
        
        var scr = scrTpl ? scrTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        var headEl = headerTpl ? headerTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        var listEl = scr.querySelector('#hero-dev-list') || document.createElement('div');
        
        var cls = (window.Hero && window.Hero.getClassDef && window.Hero.getClassDef()) || null;
        var title = cls ? ((cls.icon || '') + ' ' + (cls.name || cls.id)).trim() : 'Без класса';
        var tEl = headEl.querySelector('[data-role="title"]') || headEl;
        var lEl = headEl.querySelector('[data-role="level"]');
        if (tEl) tEl.textContent = title;
        if (lEl) lEl.textContent = 'Уровень: ' + purchasedLvl;
        
        var headerHost = scr.querySelector('#hero-dev-header') || scr;
        headerHost.innerHTML = '';
        headerHost.appendChild(headEl);
        
        levels.sort(function(a,b){ return Number(a.level||0) - Number(b.level||0); });
        
        levels.forEach(function(l){
            var row = rowTpl ? rowTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
            var freeWrap = row.querySelector('[data-role="free"]') || row;
            var paidWrap = row.querySelector('[data-role="paid"]') || row;
            var buyBtn = row.querySelector('[data-role="buyBtn"]');
            var lvlTitle = row.querySelector('[data-role="levelTitle"]');
            
            var freeIds = Array.isArray(l.autoUpgrades) ? l.autoUpgrades : [];
            var paidIds = Array.isArray(l.paidUpgrades) ? l.paidUpgrades : [];
            var isLevelOpen = Number(l.level) <= (purchasedLvl || 0);
            
            function makeItem(u, withPrice){
                var el = upTpl ? upTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                if (!upTpl) el.className = 'reward-item upgrade-item';
                var ic = el.querySelector('[data-role="icon"]') || el;
                var nm = el.querySelector('[data-role="name"]');
                var pr = el.querySelector('[data-role="price"]');
                if (ic) ic.textContent = u.icon || '💠';
                if (nm) nm.textContent = u.name || u.id;
                
                var owned = (window.Hero && window.Hero.hasUpgrade && window.Hero.hasUpgrade(u.id)) || 
                    (window.Development && Array.isArray(window.Development.purchasedPaidUpgradeIds) && window.Development.purchasedPaidUpgradeIds.includes(u.id));
                var locked = !isLevelOpen;
                
                if (locked) el.classList.add('locked');
                if (owned) {
                    el.classList.add('owned');
                    if (!withPrice) el.classList.add('owned-free');
                }
                
                var shouldShowPrice = withPrice && !locked && !owned;
                if (shouldShowPrice && pr) {
                    var price = Array.isArray(u.price) ? u.price : [];
                    var priceText = price.map(function(p){ var cd = curById[p.id] || { name: p.id, icon: '' }; return p.amount + ' ' + (cd.icon || ''); }).join(' ');
                    pr.textContent = priceText;
                }
                
                el.classList.add('clickable');
                el.addEventListener('click', function(){
                    if (locked || owned) { showUpgradeInfoModal(u.id, false); return; }
                    showUpgradeInfoModal(u.id, true);
                });
                return el;
            }
            
            freeIds.forEach(function(id){ var u = upById[id]; if (u) { var el = makeItem(u, false); freeWrap.appendChild(el); } });
            paidIds.forEach(function(id){ var u = upById[id]; if (u) { var el = makeItem(u, true); paidWrap.appendChild(el); } });
            
            if (lvlTitle) lvlTitle.textContent = 'Уровень ' + l.level;
            
            if (buyBtn) {
                var price = Array.isArray(l.price) ? l.price : [];
                var adventureState = window.adventureState || {};
                var can = (Number(l.level) === purchasedLvl + 1) && price.every(function(p){ return (adventureState.currencies && adventureState.currencies[p.id] || 0) >= p.amount; });
                
                if (Number(l.level) <= purchasedLvl) {
                    buyBtn.style.display = 'none';
                } else {
                    buyBtn.disabled = !can;
                    var priceText = price.map(function(p){ var cd = curById[p.id] || { name: p.id, icon: '' }; return p.amount + ' ' + (cd.icon || ''); }).join(' ') || '—';
                    buyBtn.textContent = 'Поднять ' + priceText;
                    buyBtn.addEventListener('click', function(){
                        if (window.Development && window.Development.purchaseLevel) {
                            if (window.Development.purchaseLevel()) { 
                                if (window.renderAdventure) window.renderAdventure(); 
                            }
                        }
                    });
                }
            }
            listEl.appendChild(row);
        });
        rootHost.appendChild(scr);
    }

    function showUpgradeInfoModal(upgradeId, isPaid) {
        try {
            var upCfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('heroUpgrades') : null;
            var list = upCfg && Array.isArray(upCfg.upgrades) ? upCfg.upgrades : [];
            var up = list.find(function(x){ return x && x.id === upgradeId; }) || { id: upgradeId, name: upgradeId, description: '' };
            
            var bodyTpl = document.getElementById('tpl-upgrade-modal-body');
            var body = bodyTpl ? bodyTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
            var descEl = body.querySelector('[data-role="desc"]') || body;
            descEl.textContent = up.description || '';
            
            var price = Array.isArray(up.price) ? up.price : [];
            if (isPaid && price.length > 0) {
                var curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
                var curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
                var curById = {}; curList.forEach(function(c){ curById[c.id] = c; });
                var pEl = body.querySelector('[data-role="priceLine"]');
                if (pEl) pEl.textContent = price.map(function(pi){ var cd = curById[pi.id] || { name: pi.id, icon: '' }; return pi.amount + ' ' + (cd.icon || ''); }).join(' ');
            }
            
            var can = isPaid ? (window.Development && window.Development.canBuyUpgrade && window.Development.canBuyUpgrade(upgradeId)?.ok) : false;
            
            if (window.UI && typeof window.UI.showModal === 'function') {
                var h = window.UI.showModal(body, { 
                    type: isPaid ? 'dialog' : 'info', 
                    title: ((up.icon || '') + ' ' + (up.name || up.id)).trim(), 
                    yesText: 'Купить', 
                    noText: 'Закрыть', 
                    yesDisabled: !can 
                });
                h.closed.then(function(ok){ 
                    if (ok && isPaid && window.Development && window.Development.buyUpgrade) { 
                        if (window.Development.buyUpgrade(upgradeId)) renderHeroDevelopment(); 
                    } 
                });
            } else {
                alert(up.name || upgradeId);
            }
        } catch {}
    }

    window.ensureAdventureTabs = ensureAdventureTabs;
    window.updateTabsActive = updateTabsActive;
    window.loadAdventureSubscreen = loadAdventureSubscreen;
    window.renderAdventureSubscreen = renderAdventureSubscreen;
    window.renderHeroDevelopment = renderHeroDevelopment;
    window.showUpgradeInfoModal = showUpgradeInfoModal;
})();

