// Универсальное переключение экранов
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        try { s.style.setProperty('display', 'none', 'important'); } catch { s.style.display = 'none'; }
    });
    try { if (window.UI && typeof window.UI.clearTooltips === 'function') window.UI.clearTooltips(); } catch {}
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('active');
    const mode = (id === 'intro-screen' || id === 'battle-screen' || id === 'adventure-screen') ? 'flex' : 'block';
    try { el.style.setProperty('display', mode, 'important'); } catch { el.style.display = mode; }
}

// Функции пользовательского интерфейса

// Рендер одного юнита
function renderUnit(unit, army) {
    const displayIcon = (unit.alive || ((typeof window.isKillPending === 'function') && window.isKillPending(unit.id, army))) ? unit.view : '💀';
    
    const unitDiv = window.UI.renderTemplate('tpl-battle-unit', {
        slots: { icon: displayIcon }
    });
    
    if (!unitDiv) return document.createElement('div');

    let className = 'unit';
    if (!unit.alive) className += ' dead';
    else if (unit.hasAttackedThisTurn) className += ' attacked';
    unitDiv.className = className;
    
    unitDiv.dataset.unitId = unit.id;
    unitDiv.dataset.army = army;

    const hpPct = Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100));
    unitDiv.style.setProperty('--hp', hpPct + '%');

    unitDiv.addEventListener('click', function(){
        try {
            if (!(window.UI && typeof window.UI.showModal === 'function')) return;
            const tpl = document.getElementById('tpl-unit-modal-body');
            const types = (window.battleConfig && window.battleConfig.unitTypes) ? window.battleConfig.unitTypes : {};
            const t = types[unit.typeId];
            const role = t && t.type ? String(t.type) : '';
            const targets = Number(unit.targets || 1);
            
            let body = null;
            if (tpl) {
                body = window.UI.renderTemplate('tpl-unit-modal-body', {
                    slots: {
                        iconName: `${String(unit.view || '')} ${String(unit.name || '')}`,
                        type: `ТИП: ${String(role || '')}`,
                        hp: `НР: ${unit.hp}/${unit.maxHp} ❤️`,
                        damage: `УРОН: ${unit.damage} 💥`,
                        targets: `ЦЕЛИ: ${targets} 🎯`
                    }
                });
                // Дополнительная стилизация для таблиц внутри модалки, если нужно, теперь в CSS
            } else {
                // Фолбэк, если шаблона нет (на всякий случай)
                body = document.createElement('div');
                body.innerHTML = `
                    <div style="text-transform:uppercase">${unit.view} ${unit.name} | ТИП: ${role}</div>
                    <div style="text-transform:uppercase">НР: ${unit.hp}/${unit.maxHp} ❤️ | УРОН: ${unit.damage} 💥 | ЦЕЛИ: ${targets} 🎯</div>
                `;
            }
            window.UI.showModal(body, { type: 'info', title: 'Описание существа' });
        } catch {}
    });
    return unitDiv;
}

// Рендер линии одной армии
function renderArmyLine(units, army, lineEl) {
    lineEl.innerHTML = '';
    const s = (typeof window.getCurrentSettings === 'function') ? window.getCurrentSettings() : null;
    const perRow = Math.max(1, Number((s && s.unitsPerRow) || 10));
    const remaining = units.slice();
    const rows = [];

    function strength(u){
        const hp = Number(u.maxHp || u.hp || 0);
        const dmg = (typeof u.damage === 'number') ? u.damage : 0;
        return { hp, dmg };
    }

    function sortByStrengthDesc(a, b){
        const sa = strength(a); const sb = strength(b);
        if (sb.hp !== sa.hp) return sb.hp - sa.hp;
        return sb.dmg - sa.dmg;
    }

    const hasMeleeInArmy = remaining.some(function(u){ return (window.getUnitRole ? window.getUnitRole(u) : 'melee') === 'melee'; });

    function takeNextRow(isFirstLine){
        const melee = remaining.filter(function(u){ return (window.getUnitRole ? window.getUnitRole(u) : 'melee') === 'melee'; }).sort(sortByStrengthDesc);
        const range = remaining.filter(function(u){ return (window.getUnitRole ? window.getUnitRole(u) : 'melee') === 'range'; }).sort(sortByStrengthDesc);
        const support = remaining.filter(function(u){ return (window.getUnitRole ? window.getUnitRole(u) : 'melee') === 'support'; }).sort(sortByStrengthDesc);
        const row = [];
        function pull(from){
            while (from.length > 0 && row.length < perRow) row.push(from.shift());
        }
        
        if (isFirstLine && hasMeleeInArmy) {
            pull(melee);
        } else {
            pull(melee);
            if (row.length < perRow) pull(range);
            if (row.length < perRow) pull(support);
        }
        
        // Переупорядочиваем внутри строки: самые сильные в центре, далее по убыванию симметрично
        const rolePriorityOrder = row.slice();
        // Уже удовлетворяет приоритетам ролей: melee -> range -> support, и отсортирован по силе в каждой группе
        const n = rolePriorityOrder.length;
        const positions = (function(){
            const order = [];
            let left = Math.floor((n - 1) / 2);
            let right = left + 1;
            if (n % 2 === 1) { order.push(left); left--; }
            while (order.length < n) {
                if (left >= 0) { order.push(left); left--; }
                if (right < n) { order.push(right); right++; }
            }
            return order;
        })();
        const arranged = new Array(n);
        for (let i = 0; i < n; i++) arranged[positions[i]] = rolePriorityOrder[i];
        row.length = 0; Array.prototype.push.apply(row, arranged);
        const used = new Set(row.map(function(u){ return u.id; }));
        for (let i = remaining.length - 1; i >= 0; i--) { if (used.has(remaining[i].id)) remaining.splice(i, 1); }
        return row;
    }

    var isFirstLine = true;
    while (remaining.length > 0) {
        rows.push(takeNextRow(isFirstLine));
        isFirstLine = false;
    }

    const frag = document.createDocumentFragment();
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '20px';

    const ordered = (army === 'defenders') ? rows.slice().reverse() : rows;
    ordered.forEach(function(rowUnits){
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'center';
        row.style.gap = '12px';
        rowUnits.forEach(function(u){ row.appendChild(renderUnit(u, army)); });
        container.appendChild(row);
    });
    frag.appendChild(container);
    lineEl.appendChild(frag);
}

// Отображение армий
function renderArmies() {
    const defendersLine = document.getElementById('defenders-line');
    const attackersLine = document.getElementById('attackers-line');
    renderArmyLine(window.gameState.defenders, 'defenders', defendersLine);
    renderArmyLine(window.gameState.attackers, 'attackers', attackersLine);
    try { updateBattleStats(); } catch {}
    if (window.applyPendingAnimations) window.applyPendingAnimations();
    updateButtonStates();
}

// Обновление состояния кнопок
function updateButtonStates() {
    const stepBtn = document.getElementById('step-btn');
    const nextTurnBtn = document.getElementById('next-turn-btn');
    const autoBtn = document.getElementById('auto-play-btn');
    const autoSpeedBtn = document.getElementById('auto-speed-btn');
    const finishBtn = document.getElementById('battle-finish-btn');
    const retryBtn = document.getElementById('battle-retry-btn');

    if (!stepBtn || !nextTurnBtn) return;

    const settings = (typeof window.getCurrentSettings === 'function') ? window.getCurrentSettings() : { battleSettings: { autoPlay: false } };
    const autoEnabled = !!(settings && settings.battleSettings && settings.battleSettings.autoPlay);

    if (window.gameState.battleEnded) {
        stepBtn.disabled = true;
        nextTurnBtn.disabled = true;
        if (autoBtn) {
            autoBtn.style.display = 'none';
            try { if (window._autoPlayActive) window._stopAutoPlay && window._stopAutoPlay(); } catch {}
        }
        if (autoSpeedBtn) autoSpeedBtn.style.display = 'none';
        const isAdventureBattle = (typeof window.battleConfigSource !== 'undefined' && (window.battleConfigSource === 'adventure' || window.battleConfigSource === 'raid'));
        if (finishBtn) finishBtn.style.display = isAdventureBattle ? '' : 'none';
        if (retryBtn) retryBtn.style.display = isAdventureBattle ? 'none' : '';
        return;
    } else {
        if (finishBtn) finishBtn.style.display = 'none';
        if (retryBtn) retryBtn.style.display = 'none';
    }

    if (autoEnabled) {
        if (stepBtn) stepBtn.style.display = 'none';
        if (nextTurnBtn) nextTurnBtn.style.display = 'none';
        if (autoBtn) {
            autoBtn.style.display = '';
            autoBtn.textContent = (window._autoPlayActive ? '🟦 Пауза' : '🎦 Продолжить');
        }
        if (autoSpeedBtn) {
            autoSpeedBtn.style.display = '';
            const sp = Math.max(1, Number(window._autoPlaySpeed || 1));
            autoSpeedBtn.textContent = '⏩ x' + sp;
        }
    } else {
        if (stepBtn) stepBtn.style.display = '';
        if (nextTurnBtn) nextTurnBtn.style.display = '';
        if (autoBtn) autoBtn.style.display = 'none';
        if (autoSpeedBtn) autoSpeedBtn.style.display = 'none';
    }

    let totalCanAttack = 0;

    for (let unit of window.gameState.attackers) {
        if (unit.alive && !unit.hasAttackedThisTurn) {
            totalCanAttack++;
        }
    }

    for (let unit of window.gameState.defenders) {
        if (unit.alive && !unit.hasAttackedThisTurn) {
            totalCanAttack++;
        }
    }

    stepBtn.disabled = (totalCanAttack === 0);
    nextTurnBtn.disabled = (totalCanAttack > 0);

    try {
        const settingsNow = (typeof window.getCurrentSettings === 'function') ? window.getCurrentSettings() : { battleSettings: { autoPlay: false } };
        const autoNow = !!(settingsNow && settingsNow.battleSettings && settingsNow.battleSettings.autoPlay);
        if (autoNow && !window.gameState.battleEnded && !window._autoPlayActive && !window._autoPlayUserPaused) {
            if (typeof window.toggleAutoPlay === 'function') window.toggleAutoPlay();
        }
    } catch {}
    try { updateBattleStats(); } catch {}
}

// Устаревшая панель информации о юните удалена

// Добавить запись в лог
function addToLog(message) {
    const currentSettings = window.getCurrentSettings();

    // Проверяем, нужно ли показывать подробный лог
    if (!currentSettings.battleSettings.showDetailedLog &&
        (message.includes('промахивается') || message.includes('атакует'))) {
        return; // Пропускаем детальные сообщения об атаках
    }

    const logDiv = document.getElementById('battle-log');
    if (!logDiv) return;

    const entry = window.UI.renderTemplate('tpl-battle-log-entry', {
        slots: { text: message }
    });
    
    if (!entry) return;

    // Добавляем новую запись в начало
    if (logDiv.firstChild) {
        logDiv.insertBefore(entry, logDiv.firstChild);
    } else {
        logDiv.appendChild(entry);
    }
}

// Переключение экранов
async function showIntro() {
    try {
        const current = (window.AppState && window.AppState.screen) || null;
        const needsConfirm = current === 'adventure' || current === 'battle';
        if (needsConfirm) {
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
        }
    } catch {}
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            window.Router.setScreen('intro');
        } else {
            showScreen('intro-screen');
        }
    } catch { showScreen('intro-screen'); }
    try { window.battleConfigSource = undefined; } catch {}
    const logDiv = document.getElementById('battle-log');
    if (logDiv) logDiv.innerHTML = '';
}

async function showBattle() {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('battle');
        } else {
            showScreen('battle-screen');
        }
    } catch { showScreen('battle-screen'); }
    try { if (window.Modifiers && typeof window.Modifiers.resetAndRecompute === 'function') window.Modifiers.resetAndRecompute(); } catch {}
    const logDiv = document.getElementById('battle-log');
    if (logDiv) logDiv.innerHTML = '';
}

function updateBattleStats(){
    const el = document.getElementById('battle-stats');
    if (!el) return;
    const aAll = window.gameState.attackers.length;
    const dAll = window.gameState.defenders.length;
    const aAlive = window.gameState.attackers.filter(function(u){ return u.alive; }).length;
    const dAlive = window.gameState.defenders.filter(function(u){ return u.alive; }).length;
    const turn = window.gameState.currentTurn || 1;
    el.textContent = `⚔️ Атакующие ${aAlive}/${aAll} · 🛡️ Защитники ${dAlive}/${dAll} · ⏳ Ход ${turn}`;
}

// Экран "Схватка"
async function showFight() {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('fight');
        } else {
            showScreen('fight-screen');
        }
    } catch { showScreen('fight-screen'); }
    const logDiv = document.getElementById('battle-log');
    if (logDiv) logDiv.innerHTML = '';
    try {
        // Инициализация сетапа боя теперь централизована в app.js через StaticData
    } catch {}
    if (typeof window.syncFightUI === 'function') window.syncFightUI();

    try {
        const host = document.getElementById('fight-config-panel');
        if (host && window.UI && typeof window.UI.mountConfigPanel === 'function') {
            host.innerHTML = '';
            window.UI.mountConfigPanel(host, {
                title: '⚙️ Конфигурация боя',
                fileLabelText: '',
                statusId: 'file-status',
                inputId: 'config-file',
                onFile: function(file){ if (window.loadConfigFile) window.loadConfigFile(file); },
                onSample: function(){ try { downloadSampleConfig(); } catch {} },
                primaryText: '🚩 Начать бой! 🚩',
                primaryId: 'battle-btn',
                primaryDisabled: true,
                onPrimary: function(){ try { startBattle(); } catch {} },
                getStatusText: function(){
                    try {
                        if (window.configLoaded && window.battleConfig && window.battleConfig.battleConfig) {
                            const cfg = window.battleConfig.battleConfig;
                            const description = cfg.description ? ' - ' + cfg.description : '';
                            return `✅ Загружена конфигурация: "${cfg.name}"${description}`;
                        }
                    } catch {}
                    return '';
                }
            });
            try { if (typeof window.syncFightUI === 'function') window.syncFightUI(); } catch {}
        }
    } catch {}
}

function backToIntroFromFight() {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            window.Router.setScreen('intro');
        } else {
            showScreen('intro-screen');
        }
    } catch { showScreen('intro-screen'); }
    const logDiv = document.getElementById('battle-log');
    if (logDiv) logDiv.innerHTML = '';
}

// Запуск боя
async function startBattle() {
    if (!window.configLoaded) {
        try {
            if (window.UI && typeof window.UI.alert === 'function') {
                await window.UI.alert('Сначала загрузите конфигурацию!');
            } else {
                alert('Сначала загрузите конфигурацию!');
            }
        } catch { try { alert('Сначала загрузите конфигурацию!'); } catch {} }
        return;
    }
    // Разрешаем сетап из StaticData ('static') или локальную загрузку ('fight')
    if (window.battleConfigSource !== 'fight' && window.battleConfigSource !== 'static') {
        if (window.loadDefaultConfig) {
            try { await window.loadDefaultConfig(); } catch {}
        }
    }
    await proceedStartBattle();
}

async function proceedStartBattle() {
    const logDiv = document.getElementById('battle-log');
    if (logDiv) {
        logDiv.innerHTML = '';
    }
    const btnHome = document.getElementById('battle-btn-home');
    if (btnHome) btnHome.style.display = '';
    await showBattle();
    initializeArmies();
    renderArmies();

    window.addToLog('🚩 Бой начался!');
    window.addToLog(`Атакующие: ${window.gameState.attackers.length} юнитов`);
    window.addToLog(`Защитники: ${window.gameState.defenders.length} юнитов`);
    try { window._autoPlaySpeed = 1; } catch {}
    try {
        const spBtn = document.getElementById('auto-speed-btn');
        if (spBtn) spBtn.textContent = '⏩ x1';
    } catch {}
    try { if (typeof window._rescheduleAutoPlayTick === 'function') window._rescheduleAutoPlayTick(); } catch {}
    try {
        try { if (window._stopAutoPlay) window._stopAutoPlay(); } catch {}
        let autoEnabled = false;
        try {
            const s = (window.GameSettings && typeof window.GameSettings.get === 'function') ? window.GameSettings.get() : (typeof window.getCurrentSettings === 'function' ? window.getCurrentSettings() : null);
            autoEnabled = !!(s && s.battleSettings && s.battleSettings.autoPlay);
        } catch {}
        if (autoEnabled && typeof window.toggleAutoPlay === 'function' && !window._autoPlayActive) {
            window.toggleAutoPlay();
        }
    } catch {}
}

// Делаем функции доступными глобально
window.startBattle = startBattle;
window.proceedStartBattle = proceedStartBattle;
window.showIntro = showIntro;
window.showBattle = showBattle;
window.showFight = showFight;
window.backToIntroFromFight = backToIntroFromFight;
window.addToLog = addToLog;
window.renderArmies = renderArmies;
window.updateButtonStates = updateButtonStates;
window.updateBattleStats = updateBattleStats;

window.cycleAutoSpeed = function(){
    try {
        const options = [1, 2, 5, 10];
        const current = Math.max(1, Number(window._autoPlaySpeed || 1));
        const idx = options.indexOf(current);
        const next = options[(idx >= 0 ? (idx + 1) % options.length : 0)];
        window._autoPlaySpeed = next;
        const spBtn = document.getElementById('auto-speed-btn');
        if (spBtn) spBtn.textContent = '⏩ x' + next;
        if (typeof window._rescheduleAutoPlayTick === 'function') window._rescheduleAutoPlayTick();
    } catch {}
};

// Автовоспроизведение шагов/ходов
(function(){
    const STEP_DELAY_MS = 1000;
    let timerId = null;

    function getStepDelay(){
        const sp = Math.max(1, Number(window._autoPlaySpeed || 1));
        return Math.max(0, Math.round(STEP_DELAY_MS / sp));
    }

    function canDoAnyStep(){
        try {
            const a = window.gameState.attackers.some(function(u){ return u.alive && !u.hasAttackedThisTurn; });
            const d = window.gameState.defenders.some(function(u){ return u.alive && !u.hasAttackedThisTurn; });
            return a || d;
        } catch { return false; }
    }

    function tick(){
        if (!window._autoPlayActive) return;
        if (!window.gameState || window.gameState.battleEnded) {
            stop('system');
            updateButtonStates();
            return;
        }
        try {
            if (canDoAnyStep()) {
                if (typeof window.step === 'function') window.step();
            } else {
                if (typeof window.nextTurn === 'function') window.nextTurn();
            }
        } catch {}
        if (!window.gameState.battleEnded && window._autoPlayActive) {
            timerId = setTimeout(tick, getStepDelay());
        } else {
            stop('system');
            updateButtonStates();
        }
    }

    function start(){
        if (window._autoPlayActive) return;
        window._autoPlayActive = true;
        window._autoPlayUserPaused = false;
        const btn = document.getElementById('auto-play-btn');
        if (btn) btn.textContent = '🟦 Пауза';
        clearTimeout(timerId);
        timerId = setTimeout(tick, getStepDelay());
    }

    function stop(reason){
        window._autoPlayActive = false;
        clearTimeout(timerId);
        timerId = null;
        if (reason === 'user') window._autoPlayUserPaused = true; else window._autoPlayUserPaused = false;
        const btn = document.getElementById('auto-play-btn');
        if (btn) btn.textContent = '🎦 Играть';
    }

    window.toggleAutoPlay = function(){
        try {
            const settings = (typeof window.getCurrentSettings === 'function') ? window.getCurrentSettings() : { battleSettings: { autoPlay: false } };
            if (!(settings && settings.battleSettings && settings.battleSettings.autoPlay)) return;
        } catch {}
        if (window._autoPlayActive) stop('user'); else start();
        updateButtonStates();
    };
    window._stopAutoPlay = function(){ stop('system'); };
    window._rescheduleAutoPlayTick = function(){
        if (!window._autoPlayActive) return;
        clearTimeout(timerId);
        timerId = setTimeout(tick, getStepDelay());
    };
})();
window.proceedStartBattle = proceedStartBattle;
window.showIntro = showIntro;
window.showBattle = showBattle;
window.showFight = showFight;
window.backToIntroFromFight = backToIntroFromFight;
window.addToLog = addToLog;
window.renderArmies = renderArmies;
window.updateButtonStates = updateButtonStates;

async function finishBattleToAdventure() {
    if (!window.adventureState || !window.adventureState.config) return;
    
    const isRaid = !!(window._raidBattleResult);
    const raidResult = window._raidBattleResult;
    
    if (isRaid) {
        const won = window.adventureState.lastResult && window.adventureState.lastResult.includes('успешен');
        
        if (won) {
            if (raidResult && raidResult.rewardId && window.Rewards && typeof window.Rewards.grantById === 'function') {
                await window.Rewards.grantById(raidResult.rewardId);
            }
        } else {
            try {
                if (window.UI && window.UI.showModal) {
                    const body = document.createElement('div');
                    body.style.textAlign = 'center';
                    body.textContent = 'Рейд провален. Отряд погиб.';
                    const h = window.UI.showModal(body, { type: 'confirm', title: 'Неудача' });
                    if (h && h.closed) {
                        await h.closed;
                    }
                }
            } catch {}
        }
        window._currentRaidData = null;
        window._raidBattleResult = null;
        window.showAdventure();
        return;
    }
    
    // Возврат на экран приключения с модалкой наград
    const assigned = (window.Raids && typeof window.Raids.getAssignedUnitsByType === 'function') ? window.Raids.getAssignedUnitsByType() : {};
    let hasAvailableUnits = false;
    for (const unitId in (window.adventureState.pool || {})) {
        const total = Number(window.adventureState.pool[unitId] || 0);
        const inRaids = Number(assigned[unitId] || 0);
        const available = Math.max(0, total - inRaids);
        if (available > 0) {
            hasAvailableUnits = true;
            break;
        }
    }
    const sectorCleared = (function(){
        try { return (typeof window.isCurrentSectorCleared === 'function') ? window.isCurrentSectorCleared() : false; } catch { return false; }
    })();
    if (!hasAvailableUnits) {
        window.showAdventureResult('💀💀💀 Поражение! Вся армия потеряна! 💀💀💀');
        return;
    }
    const last = window._lastEncounterData;

    // Если модуль Rewards доступен и у энкаунтера нет inline-наград — используем модуль
    try {
        const hasInline = !!(last && Array.isArray(last.rewards) && last.rewards.length > 0);
        if (window.Rewards && (!hasInline)) {
            if (last && typeof last.rewardId === 'string' && last.rewardId) {
                await window.Rewards.grantById(last.rewardId);
            } else {
                await window.Rewards.grantByTier(Number(last && last.tier || 1));
            }
            if (sectorCleared) {
                const advanced = (typeof window.advanceToNextSectorWithModal === 'function') ? await window.advanceToNextSectorWithModal() : false;
                if (!advanced) { window.showAdventureResult('✨🏆✨ Победа! Все испытания пройдены! ✨🏆✨'); return; }
            } else {
                window.showAdventure();
            }
            return;
        }
    } catch {}

    function resolveRewards() {
        try {
            const list = Array.isArray(last && last.rewards) ? last.rewards : [];
            return list.filter(function(r){ return r && (r.type === 'currency' || r.type === 'monster'); });
        } catch { return []; }
    }

    const rewards = resolveRewards();
    const body = document.createElement('div');
    const tpl = document.getElementById('tpl-rewards-list');
    const wrap = tpl ? tpl.content.firstElementChild.cloneNode(true) : document.createElement('div');
    const itemsEl = wrap.querySelector('[data-role="items"]') || wrap;
    rewards.forEach(function(r){
        let el = null;
        if (r.type === 'currency') {
            const tplItem = document.getElementById('tpl-reward-currency');
            el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
            if (!tplItem) el.className = 'reward-item';
            const curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
            const curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
            const curById = {}; curList.forEach(function(c){ curById[c.id] = c; });
            const cd = curById[r.id] || { name: r.id, icon: '' };
            const iconEl = el.querySelector('.reward-icon') || el;
            const nameEl = el.querySelector('.reward-name');
            let mult = 1;
            try { if (window.Modifiers && typeof window.Modifiers.getRewardMultiplier === 'function') mult = Number(window.Modifiers.getRewardMultiplier(r.id) || 1); } catch {}
            const shown = Math.max(0, Math.floor(Number(r.amount || 0) * (mult > 0 ? mult : 1)));
            if (iconEl) iconEl.textContent = cd.icon || '💠';
            if (nameEl) nameEl.textContent = `${cd.name} +${shown}`;
        } else if (r.type === 'monster') {
            const tplItem = document.getElementById('tpl-reward-unit');
            el = tplItem ? tplItem.content.firstElementChild.cloneNode(true) : document.createElement('div');
            if (!tplItem) el.className = 'reward-item';
            const monsters = (window.StaticData && window.StaticData.getConfig) ? (function(){ const m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
            const m = monsters[r.id] || { name: r.id, view: '👤' };
            const iconEl = el.querySelector('.reward-icon') || el;
            const nameEl = el.querySelector('.reward-name');
            if (iconEl) iconEl.textContent = m.view || '👤';
            if (nameEl) nameEl.textContent = `${m.name || r.id} x${r.amount}`;
        } else {
            el = document.createElement('div'); el.className = 'reward-item'; el.textContent = r.name || r.id;
        }
        itemsEl.appendChild(el);
    });
    body.appendChild(wrap);

    async function applyRewards() {
        try {
            const rs = rewards;
            if (!rs || rs.length === 0) return;
            rs.forEach(function(r){
                if (r.type === 'currency') {
                    if (!window.adventureState.currencies) window.adventureState.currencies = {};
                    let mult = 1;
                    try { if (window.Modifiers && typeof window.Modifiers.getRewardMultiplier === 'function') mult = Number(window.Modifiers.getRewardMultiplier(r.id) || 1); } catch {}
                    const add = Math.max(0, Math.floor(Number(r.amount || 0) * (mult > 0 ? mult : 1)));
                    window.adventureState.currencies[r.id] = (window.adventureState.currencies[r.id] || 0) + add;
                    try { if (window.Achievements && typeof window.Achievements.onCurrencyEarned === 'function') window.Achievements.onCurrencyEarned(r.id, add); } catch {}
                    try {
                        const curDefs = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('currencies') : null;
                        const curList = curDefs && Array.isArray(curDefs.currencies) ? curDefs.currencies : [];
                        const curById = {}; curList.forEach(function(c){ curById[c.id] = c; });
                        const cd = curById[r.id] || { name: r.id, icon: '' };
                        if (window.UI && window.UI.showToast) window.UI.showToast('copper', `${cd.name}: +${add} ${cd.icon || ''}`);
                    } catch {}
                } else if (r.type === 'monster') {
                    if (!window.adventureState.pool) window.adventureState.pool = {};
                    window.adventureState.pool[r.id] = (window.adventureState.pool[r.id] || 0) + Math.max(0, Number(r.amount || 0));
                    try { if (window.Hero && typeof window.Hero.setArmyCurrent === 'function') window.Hero.setArmyCurrent(((window.Hero.getArmyCurrent && window.Hero.getArmyCurrent()) || 0) + Math.max(0, Number(r.amount || 0))); } catch {}
                    try {
                        const monsters = (window.StaticData && window.StaticData.getConfig) ? (function(){ const m = window.StaticData.getConfig('monsters'); return (m && m.unitTypes) ? m.unitTypes : m; })() : {};
                        const m = monsters[r.id] || { name: r.id };
                        if (window.UI && window.UI.showToast) window.UI.showToast('copper', `Союзник: ${m.name || r.id} x${r.amount}`);
                    } catch {}
                }
            });
            try { window.persistAdventure && window.persistAdventure(); } catch {}
        } catch {}
    }

    async function proceed() {
        await applyRewards();
        if (sectorCleared) {
            const advanced = (typeof window.advanceToNextSectorWithModal === 'function') ? await window.advanceToNextSectorWithModal() : false;
            if (!advanced) { window.showAdventureResult('✨🏆✨ Победа! Все испытания пройдены! ✨🏆✨'); return; }
        } else {
            window.showAdventure();
        }
    }

    if (rewards.length > 0 && window.UI && typeof window.UI.showModal === 'function') {
        const h = window.UI.showModal(body, { type: 'confirm', title: 'НАГРАДЫ' });
        h.closed.then(function(){ proceed(); });
        return;
    }
    proceed();
}

function retryBattle() {
    if (window.adventureState && window.adventureState.inBattle) return; // Не показываем в приключении
    window.resetBattle();
}

window.finishBattleToAdventure = finishBattleToAdventure;
window.retryBattle = retryBattle;

// Временный роут на экран «Конфигурация» (экран будет добавлен в задаче 3)
async function showConfigScreen() {
    try { if (typeof window.showConfig === 'function') { await window.showConfig(); return; } } catch {}
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('config');
        } else {
            window.showScreen('config-screen');
        }
    } catch { window.showScreen('config-screen'); }
}

window.showConfigScreen = showConfigScreen;

async function showRules() {
    try {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('rules');
        } else {
            showScreen('rules-screen');
        }
    } catch { showScreen('rules-screen'); }

    const container = document.getElementById('rules-content');
    if (!container) return;
    container.textContent = 'Загрузка правил...';
    try {
        const url = 'assets/info/game_rules.md?_=' + Date.now();
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const md = await res.text();
        const html = md
            .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
            .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
            .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
            .replace(/^-\s+(.*)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)(\s*(<li>.*<\/li>))+?/gms, m => `<ul>${m}</ul>`)
            .replace(/`([^`]+)`/g, '<code>$1</code>');
        container.innerHTML = html;
    } catch (e) {
        container.textContent = 'Не удалось загрузить правила';
    }
}

window.showRules = showRules;

// Экран «Достижения»
async function showAchievements() {
    try {
        if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('achievements-screen', 'fragments/achievements.html');
        }
    } catch {}
    try { showScreen('achievements-screen'); } catch {}
    try { renderAchievementsGrid(); } catch {}
}

function renderAchievementsGrid(){
    const host = document.getElementById('achievements-grid');
    if (!host) return;
    host.innerHTML = '';
    let items = [];
    try { items = (window.Achievements && typeof window.Achievements.getAll === 'function') ? window.Achievements.getAll() : []; } catch { items = []; }
    items.forEach(function(a){
        const el = window.UI.renderTemplate('tpl-achievement-item', {
            slots: {
                icon: a.icon || '🏆',
                name: a.name,
                progress: (a.current || 0) + ' / ' + a.amount
            }
        });
        
        if (!el) return;

        if (a.achieved) {
            el.classList.add('achieved');
            const statusEl = el.querySelector('[data-slot="status"]');
            if (statusEl) statusEl.style.display = '';
        }

        try {
            if (window.UI && typeof window.UI.attachTooltip === 'function') {
                window.UI.attachTooltip(el, function(){
                    const wrap = document.createElement('div');
                    wrap.textContent = a.description;
                    return wrap;
                }, { delay: 400, hideDelay: 100 });
            }
        } catch {}

        el.addEventListener('click', function(){
            try {
                if (!(window.UI && typeof window.UI.showModal === 'function')) return;
                // Для тела модалки пока создадим элементы, т.к. оно динамическое
                // Можно было бы создать шаблон tpl-achievement-modal, но структура простая
                const body = document.createElement('div');
                body.style.display = 'grid';
                body.style.gridTemplateColumns = '1fr';
                body.style.gap = '10px';
                const row1 = document.createElement('div');
                row1.textContent = a.description;
                const row2 = document.createElement('div');
                const what = (a.type === 'monster') ? 'Убийства: ' : 'Валюта: ';
                row2.textContent = what + a.id_entity;
                const row3 = document.createElement('div');
                row3.textContent = 'Прогресс: ' + (a.current || 0) + ' / ' + a.amount;
                const row4 = document.createElement('div');
                row4.textContent = a.achieved ? 'Статус: Достигнуто' : 'Статус: Не достигнуто';
                body.appendChild(row1);
                body.appendChild(row2);
                body.appendChild(row3);
                body.appendChild(row4);
                window.UI.showModal(body, { type: 'info', title: a.name });
            } catch {}
        });

        host.appendChild(el);
    });
}

window.showAchievements = showAchievements;

function resetAchievementsProgress(){
    try {
        let accepted = true;
        if (window.UI && typeof window.UI.showModal === 'function') {
            const h = window.UI.showModal('Сбросить прогресс всех достижений? Это действие необратимо.', { type: 'dialog', title: 'Подтверждение' });
            h.closed.then(function(ok){
                if (!ok) return;
                try { if (window.Achievements && typeof window.Achievements.clearAll === 'function') window.Achievements.clearAll(); } catch {}
                try { renderAchievementsGrid(); } catch {}
                try { if (window.UI && typeof window.UI.showToast === 'function') window.UI.showToast('success', 'Прогресс достижений сброшен'); } catch {}
            });
            return;
        }
        if (!accepted) return;
        if (window.Achievements && typeof window.Achievements.clearAll === 'function') window.Achievements.clearAll();
        renderAchievementsGrid();
    } catch {}
}
window.resetAchievementsProgress = resetAchievementsProgress;
