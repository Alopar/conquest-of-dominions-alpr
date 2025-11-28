function getAdventureMoveDurationMs() {
    try {
        const settings = (window.GameSettings && typeof window.GameSettings.get === 'function') ? window.GameSettings.get() : null;
        const seconds = settings && typeof settings.adventureMoveDuration === 'number' ? settings.adventureMoveDuration : 5;
        return Math.max(100, seconds * 1000);
    } catch {
        return 5000;
    }
}

function renderModsDebug() {
    const host = document.getElementById('mods-debug-table');
    if (!host) return;
    host.innerHTML = '';
    const snap = (window.Modifiers && typeof window.Modifiers.getSnapshot === 'function') ? window.Modifiers.getSnapshot() : { activeEffects: [] };
    const effects = Array.isArray(snap.activeEffects) ? snap.activeEffects : [];
    const tbl = document.createElement('table');
    tbl.className = 'bestiary-table unit-info-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Type</th><th>Path</th><th>Value</th></tr>';
    const tbody = document.createElement('tbody');
    effects.filter(function(e){ return e && (e.side === 'attackers' || e.side === 'adventure') && e.value !== 0; }).forEach(function(e){
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = e.type || '';
        const td2 = document.createElement('td'); td2.textContent = e.path || '';
        const td3 = document.createElement('td'); td3.textContent = String(e.value || 0);
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        tbody.appendChild(tr);
    });
    tbl.appendChild(thead); tbl.appendChild(tbody);
    host.appendChild(tbl);
}
async function showAdventureSetup() {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('adventure-setup');
        } else if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('adventure-setup-screen', 'fragments/adventure-setup.html');
            if (window.UI.ensureMenuBar) window.UI.ensureMenuBar('adventure-setup-screen', { backLabel: 'Главная', back: window.backToIntroFromAdventure });
        }
    } catch {}
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const scr = document.getElementById('adventure-setup-screen');
    if (scr) { scr.classList.add('active'); scr.style.display = 'flex'; }
    try {
        const host = document.getElementById('adventure-config-panel');
        if (host) { host.innerHTML = ''; host.style.display = 'none'; }
        // Сбрасываем выбранный класс при входе на экран подготовки
        adventureState.selectedClassId = null;
    } catch {}
    // Полный сброс сохранения приключения при входе на экран подготовки
    try { localStorage.removeItem('adventureState'); } catch {}
    adventureState = { config: null, currencies: {}, pool: {}, selectedClassId: null, currentStageIndex: 0, completedEncounterIds: [], inBattle: false, lastResult: '', nodeContents: {}, currentNodeContent: [], sectorStartDay: null, sectorThreatLevel: 0 };
    window.adventureState = adventureState;
    restoreAdventure();
    if (adventureState.config) {
        const cfg = adventureState.config;
        const statusDiv = document.getElementById('adventure-file-status') || (document.querySelector('#adventure-config-panel [data-role="status"]'));
        const d = cfg.adventure && cfg.adventure.description ? ` - ${cfg.adventure.description}` : '';
        if (statusDiv) { statusDiv.textContent = `✅ Загружено приключение: "${cfg.adventure.name}"${d}`; statusDiv.className = 'file-status success'; }
        renderHeroClassSelectionSetup();
        const btn = document.getElementById('adventure-begin-btn'); if (btn) btn.disabled = true;
    }
    if (!adventureUserLoaded) {
        loadDefaultAdventure();
    }
}

async function backToIntroFromAdventure() {
    let proceed = true;
    try {
        if (window.UI && typeof window.UI.showModal === 'function') {
            const h = window.UI.showModal('Игровой прогресс будет потерян. Выйти на главную?', { type: 'dialog', title: 'Подтверждение', yesText: 'Да', noText: 'Отмена' });
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
            showScreen('intro-screen');
        }
    } catch { showScreen('intro-screen'); }
}

async function loadAdventureFile(file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const cfg = JSON.parse(e.target.result);
            window.validateAdventureConfig(cfg);
            try {
                if (window.StaticData && typeof window.StaticData.setUserConfig === 'function') {
                    window.StaticData.setUserConfig('adventure', cfg);
                    if (typeof window.StaticData.setUseUser === 'function') window.StaticData.setUseUser('adventure', true);
                }
            } catch {}
            initAdventureState(cfg);
            const statusDiv = document.getElementById('adventure-file-status') || (document.querySelector('#adventure-config-panel [data-role="status"]'));
            const d = cfg.adventure && cfg.adventure.description ? ` - ${cfg.adventure.description}` : '';
            if (statusDiv) { statusDiv.textContent = `✅ Загружено приключение: "${cfg.adventure.name}"${d}`; statusDiv.className = 'file-status success'; }
            renderHeroClassSelectionSetup();
            updateBeginAdventureButtonState();
            adventureUserLoaded = true;
        } catch (err) {
            const statusDiv = document.getElementById('adventure-file-status');
            if (statusDiv) { statusDiv.textContent = `❌ Ошибка загрузки: ${err.message}`; statusDiv.className = 'file-status error'; }
        }
    };
    reader.onerror = function() {
        const statusDiv = document.getElementById('adventure-file-status') || (document.querySelector('#adventure-config-panel [data-role="status"]'));
        if (statusDiv) { statusDiv.textContent = '❌ Ошибка чтения файла'; statusDiv.className = 'file-status error'; }
    };
    reader.readAsText(file);
}

async function loadDefaultAdventure() {
    try {
        const cfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('adventure') : null;
        window.validateAdventureConfig(cfg);
        initAdventureState(cfg);
        const statusDiv = document.getElementById('adventure-file-status') || (document.querySelector('#adventure-config-panel [data-role="status"]'));
        const d = cfg.adventure && cfg.adventure.description ? ` - ${cfg.adventure.description}` : '';
        if (statusDiv) { statusDiv.textContent = `✅ Загружено приключение: "${cfg.adventure.name}"${d}`; statusDiv.className = 'file-status success'; }
        renderHeroClassSelectionSetup();
        const btn = document.getElementById('adventure-begin-btn'); if (btn) btn.disabled = true;
    } catch (err) {
        const statusDiv = document.getElementById('adventure-file-status');
        if (statusDiv) { statusDiv.textContent = `❌ Ошибка загрузки стандартного приключения: ${err.message}`; statusDiv.className = 'file-status error'; }
    }
}

async function downloadSampleAdventureConfig() { try {} catch {} }

function beginAdventureFromSetup() {
    try { localStorage.removeItem('adventureState'); } catch {}
    if (!adventureState.selectedClassId) return;
    if (window.Router && window.Router.setSubscreen) window.Router.setSubscreen('map');
    else window.AppState = Object.assign(window.AppState || {}, { subscreen: 'map' });
    if (console && console.log) console.log('[Adventure] Starting new adventure, reset subscreen to map');
    if (adventureState.config) {
        initAdventureState(adventureState.config);
        try {
            adventureState.currentStageIndex = 0;
            adventureState.sectorCount = getSectorCount();
            ensureSectorSeeds(adventureState.sectorCount || 1);
            generateSectorMap(0);
        } catch {}
        applySelectedClassStartingArmy();
        showAdventure();
        return;
    }
    loadDefaultAdventure().then(() => { applySelectedClassStartingArmy(); showAdventure(); });
}

// Секторные хелперы и генерация
function getSectorCount(){
    const s = adventureState && adventureState.config && adventureState.config.sectors;
    return Array.isArray(s) ? s.length : 0;
}

function getSectorNumberByIndex(index){
    const s = adventureState && adventureState.config && adventureState.config.sectors;
    if (Array.isArray(s) && s[index] && typeof s[index].number === 'number') return s[index].number;
    return index + 1;
}

function getPathSchemeForSector(sectorNumber){
    try {
        const ps = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('pathSchemes') : null;
        const list = ps && Array.isArray(ps.schemes) ? ps.schemes : [];
        return list.find(function(x){ return x && x.sector === sectorNumber; }) || null;
    } catch { return null; }
}

function calculatePathLength(map){
    if (!map || !map.nodes) return 0;
    const nodes = Object.values(map.nodes);
    if (nodes.length === 0) return 0;
    const maxX = Math.max(...nodes.map(function(n){ return n.x || 0; }));
    return maxX;
}

function calculateThreatThresholds(pathLength, scheme){
    const multipliers = Array.isArray(scheme && scheme.threatDayMultipliers) ? scheme.threatDayMultipliers : [1.0, 1.25, 1.5];
    const additions = Array.isArray(scheme && scheme.threatDayAdditions) ? scheme.threatDayAdditions : [3, 5, 5];
    return [
        Math.floor(pathLength * multipliers[0] + additions[0]),
        Math.floor(pathLength * multipliers[1] + additions[1]),
        Math.floor(pathLength * multipliers[2] + additions[2])
    ];
}

function getCurrentThreatLevel(){
    if (!adventureState.sectorStartDay) return 0;
    const currentDay = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
    const daysInSector = currentDay - adventureState.sectorStartDay;
    const sectorNumber = getSectorNumberByIndex(adventureState.currentStageIndex || 0);
    const scheme = getPathSchemeForSector(sectorNumber);
    if (!scheme) return 0;
    const map = adventureState.map;
    if (!map) return 0;
    const pathLength = calculatePathLength(map);
    const thresholds = calculateThreatThresholds(pathLength, scheme);
    if (daysInSector <= thresholds[0]) return 0;
    if (daysInSector <= thresholds[1]) return 1;
    if (daysInSector <= thresholds[2]) return 2;
    return 2;
}

function getThreatMultiplier(){
    const sectorNumber = getSectorNumberByIndex(adventureState.currentStageIndex || 0);
    const scheme = getPathSchemeForSector(sectorNumber);
    if (!scheme) return 1.0;
    const levels = Array.isArray(scheme.threatLevels) ? scheme.threatLevels : [1.0, 1.5, 2.0];
    const threatLevel = getCurrentThreatLevel();
    return levels[threatLevel] || 1.0;
}

function ensureSectorSeeds(count){
    adventureState.sectorSeeds = Array.isArray(adventureState.sectorSeeds) ? adventureState.sectorSeeds : [];
    for (let i = adventureState.sectorSeeds.length; i < count; i++) adventureState.sectorSeeds[i] = Date.now() + i * 7919;
}

function generateSectorMap(index){
    const total = getSectorCount();
    adventureState.sectorCount = total;
    ensureSectorSeeds(total);
    const sectorNumber = getSectorNumberByIndex(index);
    const scheme = getPathSchemeForSector(sectorNumber);
    if (!scheme) throw new Error('Не найдена схема пути для сектора ' + sectorNumber);
    const gen = {
        columns: Array.isArray(scheme.columns) ? scheme.columns : [],
        edgeDensity: (scheme.edgeDensity != null) ? scheme.edgeDensity : 0.5
    };
    const cfg = { mapGen: gen };
    const seed = adventureState.sectorSeeds[index] || Date.now();
    const map = (window.AdventureGraph && typeof window.AdventureGraph.generateAdventureMap === 'function') ? window.AdventureGraph.generateAdventureMap(cfg, seed) : null;
    adventureState.map = map;
    adventureState.currentNodeId = map && map.startId;
    adventureState.resolvedNodeIds = map && map.startId ? [map.startId] : [];
    if (map && map.nodeContents) {
        adventureState.nodeContents = map.nodeContents;
    } else {
        adventureState.nodeContents = {};
    }
    adventureState.currentNodeContent = [];
    const currentDay = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
    adventureState.sectorStartDay = currentDay;
    adventureState.sectorThreatLevel = 0;
    try {
        if (window.Raids && typeof window.Raids.clearNonStarted === 'function') window.Raids.clearNonStarted();
    } catch {}
    persistAdventure();
}

function isCurrentSectorCleared(){
    const map = adventureState.map;
    if (!map || !map.nodes) return false;
    const bossIds = Object.keys(map.nodes).filter(function(id){ const n = map.nodes[id]; return n && n.type === 'boss'; });
    if (bossIds.length === 0) return false;
    return bossIds.every(function(id){ return Array.isArray(adventureState.resolvedNodeIds) && adventureState.resolvedNodeIds.includes(id); });
}

async function advanceToNextSectorWithModal(){
    const idx = Number(adventureState.currentStageIndex || 0);
    const total = Number(adventureState.sectorCount || getSectorCount() || 0);
    const hasNext = idx + 1 < total;
    if (!hasNext) return false;
    const nextNum = getSectorNumberByIndex(idx + 1);
    try {
        if (window.UI && typeof window.UI.showModal === 'function'){
            const body = document.createElement('div');
            body.style.textAlign = 'center';
            body.style.padding = '6px 4px';
            const p1 = document.createElement('div'); p1.textContent = 'Впереди следующая локация: ' + nextNum + ' 🌍'; body.appendChild(p1);
            const h = window.UI.showModal(body, { type: 'confirm', title: 'Путь пройден!' });
            await h.closed;
        }
    } catch {}
    adventureState.currentStageIndex = idx + 1;
    generateSectorMap(adventureState.currentStageIndex);
    await showAdventure();
    return true;
}

window.isCurrentSectorCleared = isCurrentSectorCleared;
window.advanceToNextSectorWithModal = advanceToNextSectorWithModal;
window.generateSectorMap = generateSectorMap;

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
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const scr = document.getElementById('adventure-screen');
    if (scr) { scr.classList.add('active'); scr.style.display = 'flex'; }
    ensureAdventureTabs();
    if (!window.AppState || !window.AppState.subscreen) {
        if (window.Router && window.Router.setSubscreen) window.Router.setSubscreen('map');
        else window.AppState = Object.assign(window.AppState || {}, { subscreen: 'map' });
    }
    renderAdventure();
}

function renderAdventure() {
    const curWrap = document.getElementById('adventure-currencies');
    if (curWrap) {
        curWrap.innerHTML = '';
        try {
            const hostTop = document.getElementById('adventure-topbar');
            if (hostTop) {
                let armyEl = document.getElementById('adventure-army-size');
                if (!armyEl) {
                    armyEl = document.createElement('div');
                    armyEl.id = 'adventure-army-size';
                    armyEl.style.display = 'flex';
                    armyEl.style.alignItems = 'center';
                    armyEl.style.gap = '6px';
                    armyEl.style.marginLeft = 'auto';
                    hostTop.insertBefore(armyEl, curWrap);
                }
                const icon = '⚔️';
                const max = (window.Hero && window.Hero.getArmyMax) ? window.Hero.getArmyMax() : 0;
                const current = (window.Hero && window.Hero.getArmyCurrent) ? window.Hero.getArmyCurrent() : 0;
                const assigned = (window.Raids && typeof window.Raids.getTotalAssignedUnits === 'function') ? window.Raids.getTotalAssignedUnits() : 0;
                if (assigned > 0) {
                    armyEl.textContent = `Армия: ${current}/${max} ${icon} (${assigned} в рейдах)`;
                } else {
                    armyEl.textContent = `Армия: ${current}/${max} ${icon}`;
                }
            }
        } catch {}
        const defs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
        const list = defs && Array.isArray(defs.currencies) ? defs.currencies : [];
        const byId = {}; list.forEach(function(c){ byId[c.id] = c; });
        const ids = Object.keys(adventureState.currencies || {});
        if (ids.length === 0) {
            const d = document.createElement('div'); d.textContent = '—'; curWrap.appendChild(d);
        } else {
            ids.forEach(function(id){
                const def = byId[id] || { name: id, icon: '' };
                const v = adventureState.currencies[id] || 0;
                const el = document.createElement('div');
                el.style.fontSize = '1.05em';
                el.textContent = `${def.name}: ${v} ${def.icon || ''}`;
                curWrap.appendChild(el);
            });
        }
    }
    const nameEl = document.getElementById('adventure-name');
    if (nameEl) {
        const day = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
        nameEl.style.fontSize = '1.05em';
        nameEl.textContent = `День: ${day} ⏳`;
    }
    // Блок сводки скрыт/удален
    ensureAdventureTabs();
    try { const tabs = document.getElementById('adventure-tabs'); if (tabs) updateTabsActive(tabs); } catch {}
    renderAdventureSubscreen();
    if ((window.AppState && window.AppState.subscreen) === 'map' || !window.AppState || !window.AppState.subscreen) {
        setTimeout(function(){ if (window.renderThreatLevelIndicator) window.renderThreatLevelIndicator(); }, 100);
    }
}

function getEncountersIndex() {
    const encCfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('encounters') : null;
    const list = encCfg && Array.isArray(encCfg.encounters) ? encCfg.encounters : [];
    const map = {};
    for (const e of list) map[e.id] = e;
    return map;
}

function getCurrentStage() { return null; }

function isEncounterDone(id) {
    return adventureState.completedEncounterIds.includes(id);
}

function getAvailableEncountersForCurrentStage() { return []; }

async function showAdventureResult(message) {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('adventure-result');
        } else if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('adventure-result-screen', 'fragments/adventure-result.html');
            if (window.UI.ensureMenuBar) window.UI.ensureMenuBar('adventure-result-screen', { backLabel: 'Главная', back: window.showIntro });
        }
    } catch {}
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const scr = document.getElementById('adventure-result-screen');
    const msg = document.getElementById('adventure-result-message');
    if (msg) msg.textContent = message;
    if (scr) { scr.classList.add('active'); scr.style.display = 'flex'; }
}

// Functions moved to ui.js and adventure/* modules

function renderNodeContentItems() {
    const container = document.getElementById('adventure-node-content-area');
    if (!container) return;
    container.innerHTML = '';
    const contents = Array.isArray(adventureState.currentNodeContent) ? adventureState.currentNodeContent : [];
    if (contents.length === 0) return;
    contents.forEach(function(item, index) {
        const tpl = document.getElementById('tpl-node-content-item');
        const el = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        if (!tpl) {
            el.className = 'node-content-item';
            const icon = document.createElement('div');
            icon.className = 'node-content-icon';
            el.appendChild(icon);
        }
        const iconEl = el.querySelector('.node-content-icon') || el.querySelector('[data-role="icon"]');
        if (iconEl) {
            if (item.type === 'event') {
                const ev = item.data;
                iconEl.textContent = ev.icon || '✨';
            } else if (item.type === 'encounter') {
                const enc = item.data;
                iconEl.textContent = enc.icon || (enc.class === 'boss' ? '👑' : enc.class === 'elite' ? '💀' : '😡');
            } else if (item.type === 'raid') {
                const raid = item.data;
                iconEl.textContent = raid.icon || '⚔️';
            }
        }
        el.setAttribute('data-index', String(index));
        el.style.cursor = 'pointer';
        el.addEventListener('click', function() {
            showContentItemModal(item, index);
        });
        container.appendChild(el);
    });
}

async function showContentItemModal(item, index) {
    try {
        if (!window.UI || typeof window.UI.showModal !== 'function') return;
        const body = document.createElement('div');
        body.style.padding = '8px';
        if (item.type === 'encounter') {
            const enc = item.data;
            const iconBlock = document.createElement('div');
            iconBlock.style.textAlign = 'center';
            iconBlock.style.marginBottom = '16px';
            iconBlock.style.padding = '12px';
            iconBlock.style.background = '#1a1a1a';
            iconBlock.style.border = '1px solid #654321';
            iconBlock.style.borderRadius = '8px';
            iconBlock.style.boxShadow = '0 4px 10px rgba(0,0,0,0.4)';
            const iconEl = document.createElement('div');
            iconEl.style.fontSize = '3em';
            iconEl.textContent = enc.icon || (enc.class === 'boss' ? '👑' : enc.class === 'elite' ? '💀' : '😡');
            iconBlock.appendChild(iconEl);
            const nameEl = document.createElement('div');
            nameEl.style.fontSize = '1.2em';
            nameEl.style.fontWeight = '600';
            nameEl.style.color = '#cd853f';
            nameEl.style.marginTop = '8px';
            nameEl.textContent = enc.name || enc.id || 'Энкаунтер';
            iconBlock.appendChild(nameEl);
            body.appendChild(iconBlock);
            (function(){ const sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '8px 0'; body.appendChild(sep); })();
            if (enc.monsters && Array.isArray(enc.monsters)) {
                const enemiesTitle = document.createElement('div');
                enemiesTitle.style.margin = '6px 0';
                enemiesTitle.style.color = '#cd853f';
                enemiesTitle.style.textAlign = 'center';
                enemiesTitle.textContent = 'Возможные противники';
                body.appendChild(enemiesTitle);
                const monsters = (window.StaticData && window.StaticData.getConfig) ? (function(){ const m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
                const enemiesWrapTpl = document.getElementById('tpl-rewards-list');
                const enemiesWrap = enemiesWrapTpl ? enemiesWrapTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                const enemiesItems = enemiesWrap.querySelector('[data-role="items"]') || enemiesWrap;
                const uniqEnemyIds = Array.from(new Set((enc.monsters || []).map(function(g){ return g && g.id; }).filter(Boolean)));
                uniqEnemyIds.forEach(function(id){
                    const itemTpl = document.getElementById('tpl-reward-unit');
                    const el = itemTpl ? itemTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                    if (!itemTpl) el.className = 'reward-item';
                    el.classList.add('clickable');
                    const m = monsters[id] || { name: id, view: '👤' };
                    const monsterData = enc.monsters.find(function(mon){ return mon && mon.id === id; });
                    const amountText = monsterData && monsterData.amount ? monsterData.amount : '?';
                    const iconEl = el.querySelector('.reward-icon') || el;
                    const nameEl = el.querySelector('.reward-name');
                    if (iconEl) iconEl.textContent = m.view || '👤';
                    if (nameEl) nameEl.textContent = `${m.name || id} (${amountText})`;
                    el.addEventListener('click', function(e){ try { e.stopPropagation(); } catch {} showUnitInfoModal(id); });
                    enemiesItems.appendChild(el);
                });
                body.appendChild(enemiesWrap);
                (function(){ const sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '10px 0 8px 0'; body.appendChild(sep); })();
            }
            const rewardsTitle = document.createElement('div');
            rewardsTitle.style.margin = '10px 0 6px 0';
            rewardsTitle.style.color = '#cd853f';
            rewardsTitle.style.textAlign = 'center';
            rewardsTitle.textContent = 'Возможные награды';
            body.appendChild(rewardsTitle);
            let rewards = [];
            if (enc.rewardId) {
                const rewardsCfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('rewards') : null;
                const rewardsTables = rewardsCfg && Array.isArray(rewardsCfg.tables) ? rewardsCfg.tables : [];
                const rewardTable = rewardsTables.find(function(t){ return t && t.id === enc.rewardId; });
                if (rewardTable && Array.isArray(rewardTable.rewards)) {
                    rewards = rewardTable.rewards;
                }
            } else if (Array.isArray(enc.rewards)) {
                rewards = enc.rewards;
            }
            if (rewards.length > 0) {
                const curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
                const curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
                const curById = {}; curList.forEach(function(c){ curById[c.id] = c; });
                const monsters = (window.StaticData && window.StaticData.getConfig) ? (function(){ const m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
                const rewardsWrapTpl = document.getElementById('tpl-rewards-list');
                const rewardsWrap = rewardsWrapTpl ? rewardsWrapTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                const rewardsItems = rewardsWrap.querySelector('[data-role="items"]') || rewardsWrap;
                rewards.forEach(function(r){
                    if (r && r.type === 'currency') {
                        const tplItem = document.getElementById('tpl-reward-currency');
                        const el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
                        if (!tplItem) el.className = 'reward-item';
                        const cd = curById[r.id] || { name: r.id, icon: '💠' };
                        const iconEl = el.querySelector('.reward-icon') || el;
                        const nameEl = el.querySelector('.reward-name');
                        if (iconEl) iconEl.textContent = cd.icon || '💠';
                        if (nameEl) nameEl.textContent = cd.name || r.id;
                        rewardsItems.appendChild(el);
                    } else if (r && (r.type === 'monster' || r.type === 'unit')) {
                        const tplItem = document.getElementById('tpl-reward-unit');
                        const el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
                        if (!tplItem) el.className = 'reward-item';
                        el.classList.add('clickable');
                        const m = monsters[r.id] || { name: r.id, view: '👤' };
                        const iconEl = el.querySelector('.reward-icon') || el;
                        const nameEl = el.querySelector('.reward-name');
                        if (iconEl) iconEl.textContent = m.view || '👤';
                        if (nameEl) nameEl.textContent = m.name || r.id;
                        el.addEventListener('click', function(e){ try { e.stopPropagation(); } catch {} showUnitInfoModal(r.id); });
                        rewardsItems.appendChild(el);
                    }
                });
                body.appendChild(rewardsWrap);
            } else {
                const noRewards = document.createElement('div');
                noRewards.style.textAlign = 'center';
                noRewards.style.color = '#888';
                noRewards.style.padding = '8px';
                noRewards.textContent = 'Награды не указаны';
                body.appendChild(noRewards);
            }
        } else if (item.type === 'event') {
            const ev = item.data;
            const iconBlock = document.createElement('div');
            iconBlock.style.textAlign = 'center';
            iconBlock.style.marginBottom = '16px';
            iconBlock.style.padding = '12px';
            iconBlock.style.background = '#1a1a1a';
            iconBlock.style.border = '1px solid #654321';
            iconBlock.style.borderRadius = '8px';
            iconBlock.style.boxShadow = '0 4px 10px rgba(0,0,0,0.4)';
            const iconEl = document.createElement('div');
            iconEl.style.fontSize = '3em';
            iconEl.textContent = ev.icon || '✨';
            iconBlock.appendChild(iconEl);
            const nameEl = document.createElement('div');
            nameEl.style.fontSize = '1.2em';
            nameEl.style.fontWeight = '600';
            nameEl.style.color = '#cd853f';
            nameEl.style.marginTop = '8px';
            nameEl.textContent = ev.name || ev.id || 'Событие';
            iconBlock.appendChild(nameEl);
            body.appendChild(iconBlock);
        } else if (item.type === 'raid') {
            const raidDef = item.data;
            const iconBlock = document.createElement('div');
            iconBlock.style.textAlign = 'center';
            iconBlock.style.marginBottom = '16px';
            iconBlock.style.padding = '12px';
            iconBlock.style.background = '#1a1a1a';
            iconBlock.style.border = '1px solid #654321';
            iconBlock.style.borderRadius = '8px';
            iconBlock.style.boxShadow = '0 4px 10px rgba(0,0,0,0.4)';
            const iconEl = document.createElement('div');
            iconEl.style.fontSize = '3em';
            iconEl.textContent = raidDef.icon || '⚔️';
            iconBlock.appendChild(iconEl);
            const nameEl = document.createElement('div');
            nameEl.style.fontSize = '1.2em';
            nameEl.style.fontWeight = '600';
            nameEl.style.color = '#cd853f';
            nameEl.style.marginTop = '8px';
            nameEl.textContent = raidDef.name || raidDef.id || 'Рейд';
            iconBlock.appendChild(nameEl);
            body.appendChild(iconBlock);
            const desc = document.createElement('div');
            desc.style.textAlign = 'center';
            desc.style.margin = '8px 0 10px 0';
            desc.textContent = `Длительность: ${raidDef.duration_days} дней`;
            body.appendChild(desc);
            (function(){ const sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '8px 0'; body.appendChild(sep); })();
            const encCfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('encounters') : null;
            const encounters = encCfg && Array.isArray(encCfg.encounters) ? encCfg.encounters : [];
            const enc = encounters.find(function(e){ return e && e.id === raidDef.encounter_id; });
            if (enc) {
                const enemiesTitle = document.createElement('div');
                enemiesTitle.style.margin = '6px 0';
                enemiesTitle.style.color = '#cd853f';
                enemiesTitle.style.textAlign = 'center';
                enemiesTitle.textContent = 'Возможные противники';
                body.appendChild(enemiesTitle);
                const monsters = (window.StaticData && window.StaticData.getConfig) ? (function(){ const m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
                const enemiesWrapTpl = document.getElementById('tpl-rewards-list');
                const enemiesWrap = enemiesWrapTpl ? enemiesWrapTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                const enemiesItems = enemiesWrap.querySelector('[data-role="items"]') || enemiesWrap;
                const uniqEnemyIds = Array.from(new Set((enc.monsters || []).map(function(g){ return g && g.id; }).filter(Boolean)));
                uniqEnemyIds.forEach(function(id){
                    const itemTpl = document.getElementById('tpl-reward-unit');
                    const el = itemTpl ? itemTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                    if (!itemTpl) el.className = 'reward-item';
                    el.classList.add('clickable');
                    const m = monsters[id] || { name: id, view: '👤' };
                    const iconEl = el.querySelector('.reward-icon') || el;
                    const nameEl = el.querySelector('.reward-name');
                    if (iconEl) iconEl.textContent = m.view || '👤';
                    if (nameEl) nameEl.textContent = m.name || id;
                    el.addEventListener('click', function(e){ try { e.stopPropagation(); } catch {} showUnitInfoModal(id); });
                    enemiesItems.appendChild(el);
                });
                body.appendChild(enemiesWrap);
                (function(){ const sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '10px 0 8px 0'; body.appendChild(sep); })();
            }
            const rewardsTitle = document.createElement('div');
            rewardsTitle.style.margin = '10px 0 6px 0';
            rewardsTitle.style.color = '#cd853f';
            rewardsTitle.style.textAlign = 'center';
            rewardsTitle.textContent = 'Возможные награды';
            body.appendChild(rewardsTitle);
            const rewardsCfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('rewards') : null;
            const rewardsTables = rewardsCfg && Array.isArray(rewardsCfg.tables) ? rewardsCfg.tables : [];
            const rewardTable = rewardsTables.find(function(t){ return t && t.id === raidDef.reward_id; });
            if (rewardTable && Array.isArray(rewardTable.rewards)) {
                const curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
                const curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
                const curById = {}; curList.forEach(function(c){ curById[c.id] = c; });
                const rewardsWrapTpl = document.getElementById('tpl-rewards-list');
                const rewardsWrap = rewardsWrapTpl ? rewardsWrapTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
                const rewardsItems = rewardsWrap.querySelector('[data-role="items"]') || rewardsWrap;
                rewardTable.rewards.forEach(function(r){
                    if (r && r.type === 'currency') {
                        const tplItem = document.getElementById('tpl-reward-currency');
                        const el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
                        if (!tplItem) el.className = 'reward-item';
                        const cd = curById[r.id] || { name: r.id, icon: '💠' };
                        const iconEl = el.querySelector('.reward-icon') || el;
                        const nameEl = el.querySelector('.reward-name');
                        if (iconEl) iconEl.textContent = cd.icon || '💠';
                        if (nameEl) nameEl.textContent = cd.name || r.id;
                        rewardsItems.appendChild(el);
                    }
                });
                body.appendChild(rewardsWrap);
            }
        }
        const titleText = item.type === 'event' ? 'Событие' : (item.type === 'raid' ? 'Рейд' : 'Энкаунтер');
        const h = window.UI.showModal(body, { type: 'dialog', title: titleText, yesText: 'Начать', noText: 'Закрыть' });
        const proceed = await h.closed;
        if (proceed) {
            if (item.type === 'encounter') {
                startEncounterBattle(item.data);
            } else if (item.type === 'event') {
                await handleEventFromContent(item.data);
            } else if (item.type === 'raid') {
                const raidDef = item.data;
                if (window.Raids && typeof window.Raids.addAvailableRaids === 'function') {
                    window.Raids.addAvailableRaids([raidDef.id]);
                }
                const allRaids = (window.Raids && typeof window.Raids.getAllRaids === 'function') ? window.Raids.getAllRaids() : [];
                const raidInstance = allRaids.find(function(r){ return r.raidDefId === raidDef.id && r.status === 'available'; });
                if (raidInstance) {
                    await showArmySplitModal(raidInstance, raidDef);
                    const idx = adventureState.currentNodeContent.findIndex(function(ci) {
                        return ci.type === item.type && ci.id === item.id && ci.data && ci.data.id === item.data.id;
                    });
                    if (idx >= 0) {
                        adventureState.currentNodeContent.splice(idx, 1);
                        persistAdventure();
                        renderNodeContentItems();
                    }
                }
                return;
            }
            const idx = adventureState.currentNodeContent.findIndex(function(ci) {
                return ci.type === item.type && ci.id === item.id && ci.data && ci.data.id === item.data.id;
            });
            if (idx >= 0) {
                adventureState.currentNodeContent.splice(idx, 1);
                persistAdventure();
                renderNodeContentItems();
            }
        }
    } catch {}
}

async function handleEventFromContent(eventData) {
    try {
        if (!eventData) return;
        if (window.UI && typeof window.UI.showModal === 'function') {
            const body = document.createElement('div');
            const text = document.createElement('div');
            text.textContent = eventData.description || eventData.name || eventData.id;
            text.style.textAlign = 'center';
            text.style.margin = '8px 0 10px 0';
            body.appendChild(text);
            const wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.justifyContent = 'center';
            wrap.style.gap = '10px';
            body.appendChild(wrap);
            const h = window.UI.showModal(body, { type: 'dialog', title: eventData.name || 'Событие', yesText: eventData.options?.[0]?.text || 'Ок', noText: eventData.options?.[1]?.text || 'Пропустить' });
            h.closed.then(async function(ok) {
                const opt = ok ? (eventData.options?.[0]) : (eventData.options?.[1]);
                await applyEffects(opt && opt.effects);
                renderAdventure();
            });
        }
    } catch {}
}

function resolveGraphNode(nodeId){
    try {
        const map = adventureState.map; if (!map) { renderAdventure(); return; }
        const node = map.nodes[nodeId]; if (!node) { renderAdventure(); return; }
        // Помечаем посещение
        adventureState.resolvedNodeIds = Array.isArray(adventureState.resolvedNodeIds) ? adventureState.resolvedNodeIds : [];
        if (!adventureState.resolvedNodeIds.includes(nodeId)) adventureState.resolvedNodeIds.push(nodeId);
        persistAdventure();
        renderAdventure();
    } catch { renderAdventure(); }
}

async function handleEventNode(node){
    try {
        const cfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('events') : null;
        const list = (cfg && Array.isArray(cfg.events)) ? cfg.events : [];
        const tier = Number(node && node.tier || 1);
        const pool = list.filter(function(ev){ return Number(ev && ev.tier) === tier; });
        const e = (pool.length > 0 ? pool[Math.floor(Math.random()*pool.length)] : (list[0] || null));
        if (!e) { renderAdventure(); return; }
        if (window.UI && typeof window.UI.showModal === 'function') {
            const body = document.createElement('div');
            const text = document.createElement('div'); text.textContent = e.description || e.name || e.id; text.style.textAlign = 'center'; text.style.margin = '8px 0 10px 0'; body.appendChild(text);
            const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.justifyContent = 'center'; wrap.style.gap = '10px'; body.appendChild(wrap);
            const h = window.UI.showModal(body, { type: 'dialog', title: e.name || 'Событие', yesText: e.options?.[0]?.text || 'Ок', noText: e.options?.[1]?.text || 'Пропустить' });
            h.closed.then(async function(ok){
                const opt = ok ? (e.options?.[0]) : (e.options?.[1]);
                await applyEffects(opt && opt.effects);
                renderAdventure();
            });
        } else { renderAdventure(); }
    } catch { renderAdventure(); }
}

async function handleRewardNode(){
    try {
        const cfg = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('rewards') : null;
        const tables = (cfg && Array.isArray(cfg.tables)) ? cfg.tables : [];
        const t = tables[0] || null;
        if (t) await applyEffects(t.rewards);
    } catch {}
    renderAdventure();
}

async function applyEffects(effects){
    const arr = Array.isArray(effects) ? effects : [];
    for (const e of arr){
        if (!e || !e.type) continue;
        if (e.type === 'currency') {
            adventureState.currencies = adventureState.currencies || {};
            adventureState.currencies[e.id] = (adventureState.currencies[e.id] || 0) + Number(e.amount||0);
        } else if (e.type === 'rewardByTier') {
            try { if (window.Rewards && typeof window.Rewards.grantByTier === 'function') await window.Rewards.grantByTier(Number(e.tier||1)); } catch {}
        } else if (e.type === 'rewardById') {
            try { if (window.Rewards && typeof window.Rewards.grantById === 'function') await window.Rewards.grantById(String(e.id||'')); } catch {}
        }
    }
    persistAdventure();
}

function renderHeroClassSelectionSetup() {
    const cont = document.getElementById('hero-class-select');
    if (!cont) return;
    cont.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'hero-class-list';
    let classesCfg = null;
    try {
        classesCfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('heroClasses') : null;
    } catch {}
    const list = classesCfg && Array.isArray(classesCfg.classes) ? classesCfg.classes : (Array.isArray(classesCfg) ? classesCfg : []);
    const frag = window.UI && typeof window.UI.cloneTemplate === 'function' ? window.UI.cloneTemplate('tpl-hero-class-item') : null;
    const items = [];
    for (const c of list) {
        let el;
        if (frag) {
            el = frag.cloneNode(true).firstElementChild;
        } else {
            el = document.createElement('div'); el.className = 'hero-class-item';
            const i = document.createElement('div'); i.className = 'hero-class-icon'; el.appendChild(i);
            const n = document.createElement('div'); n.className = 'hero-class-name'; el.appendChild(n);
        }
        el.dataset.id = c.id;
        const iconEl = el.querySelector('[data-role="icon"]') || el.querySelector('.hero-class-icon');
        const nameEl = el.querySelector('[data-role="name"]') || el.querySelector('.hero-class-name');
        if (iconEl) iconEl.textContent = c.icon || '❓';
        if (nameEl) nameEl.textContent = c.name || c.id;
        const requiredAchId = c.requiresAchievementId;
        let isLocked = false;
        if (requiredAchId) {
            try {
                const a = (window.Achievements && typeof window.Achievements.getById === 'function') ? window.Achievements.getById(requiredAchId) : null;
                isLocked = !(a && a.achieved);
            } catch { isLocked = true; }
        }
        if (isLocked) el.classList.add('locked');
        el.addEventListener('click', function(){ onHeroClassClick(c, isLocked); });
        if (adventureState.selectedClassId === c.id) el.classList.add('selected');
        wrapper.appendChild(el);
        items.push(el);
    }
    cont.appendChild(wrapper);
}

async function onHeroClassClick(c, isLocked) {
    const body = document.createElement('div');
    // Описание
    const desc = document.createElement('div');
    desc.style.marginBottom = '8px';
    desc.style.textAlign = 'center';
    desc.textContent = c.description || '';
    body.appendChild(desc);
    // Разделитель
    (function(){ const sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '8px 0'; body.appendChild(sep); })();
    // Начальная армия
    const armyTitle = document.createElement('div'); armyTitle.style.margin = '6px 0'; armyTitle.style.color = '#cd853f'; armyTitle.style.textAlign = 'center'; armyTitle.textContent = 'Начальная армия'; body.appendChild(armyTitle);
    if (Array.isArray(c.startingArmy) && c.startingArmy.length > 0) {
        const monsters = (window.StaticData && window.StaticData.getConfig) ? (function(){ const m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
        const listTpl = document.getElementById('tpl-rewards-list');
        const wrap = listTpl ? listTpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
        const items = wrap.querySelector('[data-role="items"]') || wrap;
        for (const g of c.startingArmy) {
            const tplItem = document.getElementById('tpl-reward-unit');
            const el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
            if (!tplItem) el.className = 'reward-item';
            el.classList.add('clickable');
            const m = monsters[g.id] || { name: g.id, view: '👤' };
            const iconEl = el.querySelector('.reward-icon') || el;
            const nameEl = el.querySelector('.reward-name');
            if (iconEl) iconEl.textContent = m.view || '👤';
            if (nameEl) nameEl.textContent = `${m.name || g.id} x${g.count}`;
            el.addEventListener('click', function(e){ try { e.stopPropagation(); } catch {} showUnitInfoModal(g.id); });
            items.appendChild(el);
        }
        body.appendChild(wrap);
    }
    if (isLocked) {
        (function(){ const sep = document.createElement('div'); sep.style.height = '1px'; sep.style.background = '#444'; sep.style.opacity = '0.6'; sep.style.margin = '8px 0'; body.appendChild(sep); })();
        const reqTitle = document.createElement('div'); reqTitle.style.margin = '6px 0'; reqTitle.style.color = '#cd853f'; reqTitle.style.textAlign = 'center'; reqTitle.textContent = 'Требуется достижение'; body.appendChild(reqTitle);
        const row = document.createElement('div'); row.style.display = 'flex'; row.style.justifyContent = 'center'; row.style.gap = '8px'; row.style.alignItems = 'center';
        try {
            const ach = (window.Achievements && typeof window.Achievements.getById === 'function') ? window.Achievements.getById(c.requiresAchievementId) : null;
            const icon = document.createElement('span'); icon.textContent = ach && ach.icon ? ach.icon : '🏆';
            const name = document.createElement('span'); name.textContent = ach && ach.name ? ach.name : (c.requiresAchievementId || ''); name.style.fontWeight = '600';
            row.appendChild(icon); row.appendChild(name);
        } catch {}
        body.appendChild(row);
        try {
            if (window.UI && typeof window.UI.showModal === 'function') {
                const title = `${c.icon || ''} ${c.name || c.id}`.trim();
                await window.UI.showModal(body, { type: 'info', title }).closed;
            } else { alert('Класс недоступен'); }
        } catch {}
        return;
    }
    let accepted = false;
    try {
        if (window.UI && typeof window.UI.showModal === 'function') {
            const title = `${c.icon || ''} ${c.name || c.id}`.trim();
            const h = window.UI.showModal(body, { type: 'dialog', title, yesText: 'Выбрать', noText: 'Закрыть' });
            accepted = await h.closed;
        } else { accepted = confirm('Выбрать класс ' + (c.name || c.id) + '?'); }
    } catch {}
    if (!accepted) return;
    // Выбор класса через систему Героя
    try { if (window.Hero && typeof window.Hero.setClassId === 'function') window.Hero.setClassId(c.id); } catch {}
    adventureState.selectedClassId = c.id;
    adventureState.pool = {};
    const startArmy = (window.Hero && typeof window.Hero.getStartingArmy === 'function') ? window.Hero.getStartingArmy() : [];
    for (const g of startArmy) { if (g && g.id && g.count > 0) adventureState.pool[g.id] = (adventureState.pool[g.id] || 0) + g.count; }
    persistAdventure();
    const btn = document.getElementById('adventure-begin-btn'); if (btn) btn.disabled = false;
    const listRoot = document.getElementById('hero-class-select');
    if (listRoot) listRoot.querySelectorAll('.hero-class-item').forEach(function(node){
        node.classList.toggle('selected', node.dataset.id === c.id);
    });
}

async function onEncounterClick(encData, available) {
    if (window.onEncounterClick) {
        await window.onEncounterClick(encData, available);
    }
}


// Functions moved to ui.js and adventure/* modules

window.showAdventureSetup = showAdventureSetup;
window.backToIntroFromAdventure = backToIntroFromAdventure;
window.loadAdventureFile = loadAdventureFile;
window.loadDefaultAdventure = loadDefaultAdventure;
window.downloadSampleAdventureConfig = downloadSampleAdventureConfig;
window.beginAdventureFromSetup = beginAdventureFromSetup;
// window.startEncounterBattle = startEncounterBattle; // Moved to battle.js
window.renderAdventure = renderAdventure;
window.showAdventureResult = showAdventureResult;
// window.showUnitInfoModal = showUnitInfoModal; // Moved to ui.js

window._raidBattleResult = null;
