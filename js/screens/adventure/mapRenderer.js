/**
 * @fileoverview Модуль рендеринга карты приключения
 */

/**
 * @param {string} nodeId
 * @returns {{x: number, y: number}}
 */
function getGraphNodePos(nodeId){
    const map = adventureState.map; if (!map) return { x:0, y:0 };
    const n = map.nodes[nodeId]; if (!n) return { x:0, y:0 };
    const colW = 160; const colH = 120; const padX = 120; const padY = 120;
    return { x: padX + n.x * colW, y: padY + n.y * colH };
}

function renderMapBoard() {
    const board = document.getElementById('adventure-map-board');
    if (!board) return;
    board.innerHTML = '';
    board.classList.add('adv-map-root');
    try {
        const sectorEl = document.getElementById('adventure-sector-indicator');
        if (sectorEl) {
            const total = (function(){ const s = adventureState && adventureState.config && adventureState.config.sectors; return Array.isArray(s) ? s.length : 0; })();
            const idx = Number(adventureState.currentStageIndex || 0);
            const secNum = (function(){ const s = adventureState && adventureState.config && adventureState.config.sectors; return (Array.isArray(s) && s[idx] && s[idx].number) || (idx+1); })();
            sectorEl.textContent = total > 0 ? ('Сектор: ' + secNum + '/' + total + '🌍') : '';
            sectorEl.style.color = '#cd853f';
            sectorEl.style.fontSize = '1.05em';
            sectorEl.style.fontWeight = '600';
            sectorEl.style.textShadow = '1px 1px 3px rgba(0,0,0,0.7)';
        }
    } catch {}
    // Ленивая генерация карты сектора, если её нет
    if (!adventureState.map) {
        try {
            if (typeof adventureState.currentStageIndex !== 'number') adventureState.currentStageIndex = 0;
            if (!adventureState.sectorCount) adventureState.sectorCount = getSectorCount();
            ensureSectorSeeds(adventureState.sectorCount || 1);
            generateSectorMap(adventureState.currentStageIndex || 0);
        } catch {}
    }
    if (adventureState.map && !adventureState.sectorStartDay) {
        const currentDay = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
        adventureState.sectorStartDay = currentDay;
        adventureState.sectorThreatLevel = getCurrentThreatLevel();
        persistAdventure();
    }
    const map = adventureState.map;
    if (!map || !map.nodes) { board.innerHTML = '<div>Карта недоступна</div>'; return; }
    const svg = (window.AdventureGraph && window.AdventureGraph.renderSvgGraph) ? window.AdventureGraph.renderSvgGraph(board, map, { colW:160, colH:120, padX:120, padY:120 }) : null;
    // Геометрия
    const colW = 160; const colH = 120; const padX = 120; const padY = 120;
    function nodePos(n){ return { x: padX + n.x * colW, y: padY + n.y * colH }; }
    // навешиваем обработчики клика на узлы из сгенерированного SVG
    if (svg) {
        const mapState = { map: adventureState.map, currentNodeId: adventureState.currentNodeId, resolvedNodeIds: adventureState.resolvedNodeIds };
        const reachable = new Set();
        try {
            // BFS из текущей ноды по доступным рёбрам для вычисления достижимых
            const q = [adventureState.currentNodeId];
            const seen = new Set(q);
            const edges = Array.from(svg.querySelectorAll('.adv-edge'));
            while (q.length > 0) {
                const cur = q.shift(); reachable.add(cur);
                for (const line of edges) {
                    const from = line.getAttribute('data-from'); const to = line.getAttribute('data-to');
                    if (from === cur && !seen.has(to)) { seen.add(to); q.push(to); }
                }
            }
        } catch {}

        svg.querySelectorAll('g[data-id]').forEach(function(g){
            const id = g.getAttribute('data-id');
            const available = window.AdventureGraph.isNodeAvailable(mapState, id);
            const visited = Array.isArray(adventureState.resolvedNodeIds) && adventureState.resolvedNodeIds.includes(id);
            g.classList.toggle('available', available);
            g.classList.toggle('locked', !available && !visited);
            g.classList.toggle('visited', visited);
            const isFaded = !available && !visited && !reachable.has(id);
            g.classList.toggle('faded', isFaded);
            g.addEventListener('click', function(){ onGraphNodeClick(id); });
            if (available) {
                g.addEventListener('mouseenter', function(){
                    svg.querySelectorAll('.adv-edge').forEach(function(line){ if (line.getAttribute('data-to') === id && line.getAttribute('data-from') === adventureState.currentNodeId) line.classList.add('hover'); });
                });
                g.addEventListener('mouseleave', function(){
                    svg.querySelectorAll('.adv-edge.hover').forEach(function(line){ line.classList.remove('hover'); });
                });
            }
        });
        // отметить рёбра по состоянию доступности/посещенности
        svg.querySelectorAll('.adv-edge').forEach(function(line){
            const to = line.getAttribute('data-to'); const from = line.getAttribute('data-from');
            const toVisited = adventureState.resolvedNodeIds && adventureState.resolvedNodeIds.includes(to);
            const fromVisited = adventureState.resolvedNodeIds && adventureState.resolvedNodeIds.includes(from);
            const available = window.AdventureGraph.isNodeAvailable(mapState, to);
            line.classList.remove('locked','available','visited');
            if (toVisited && fromVisited) line.classList.add('visited');
            else if (available && from === adventureState.currentNodeId) line.classList.add('available');
            else {
                const faded = !reachable.has(to) && !fromVisited && !toVisited;
                line.classList.add(faded ? 'faded' : 'locked');
            }
        });
    }
    // Маркер игрока (SVG)
    const player = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    player.setAttribute('id', 'adv-player');
    const pBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pBg.setAttribute('r', '14'); pBg.setAttribute('fill', '#cd853f'); pBg.setAttribute('stroke', '#654321'); pBg.setAttribute('stroke-width', '2');
    const pIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    pIcon.setAttribute('text-anchor', 'middle'); pIcon.setAttribute('dominant-baseline', 'middle'); pIcon.style.fontSize = '14px'; pIcon.textContent = '🚩';
    player.appendChild(pBg); player.appendChild(pIcon);
    let p = null;
    try {
        const cur = adventureState.currentNodeId && map.nodes[adventureState.currentNodeId];
        if (cur && map._posOf && map._posOf[cur.id]) p = map._posOf[cur.id];
    } catch {}
    if (!p) { const fallback = (function(){ const n = map.nodes[adventureState.currentNodeId]; if (!n) return {x:120,y:120}; const padX=120,padY=120; const cg=180, rg=120; return { x: padX + (n.x||0)*cg, y: padY + (n.y||0)*rg }; })(); p = fallback; }
    player.setAttribute('transform', `translate(${p.x},${p.y})`);
    svg.appendChild(player);
    // Автопрокрутка контейнера к позиции фишки героя
    try {
        const bx = Math.max(0, Math.min(board.scrollWidth - board.clientWidth, Math.round(p.x - board.clientWidth * 0.5)));
        const by = Math.max(0, Math.min(board.scrollHeight - board.clientHeight, Math.round(p.y - board.clientHeight * 0.5)));
        board.scrollLeft = bx;
        board.scrollTop = by;
    } catch {}
    // Если страница перезагружена в момент движения — доводим маркер и завершаем ноду
    try {
        const targetId = adventureState.movingToNodeId;
        if (targetId && targetId !== adventureState.currentNodeId) {
            setTimeout(async function(){
                await movePlayerToNode(targetId);
                adventureState.currentNodeId = targetId;
                persistAdventure();
                resolveGraphNode(targetId);
            }, 0);
        }
    } catch {}
    renderThreatLevelIndicator();
    renderNodeContentItems();
}

function renderThreatLevelIndicator(){
    const container = document.getElementById('adventure-threat-indicator');
    if (!container) return;
    
    if (!adventureState.map) return;
    
    if (!adventureState.sectorStartDay) {
        const currentDay = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
        adventureState.sectorStartDay = currentDay;
        adventureState.sectorThreatLevel = getCurrentThreatLevel();
        persistAdventure();
    }
    
    const currentDay = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
    const daysInSector = currentDay - adventureState.sectorStartDay;
    const sectorNumber = getSectorNumberByIndex(adventureState.currentStageIndex || 0);
    const scheme = getPathSchemeForSector(sectorNumber);
    if (!scheme) return;
    
    const pathLength = calculatePathLength(adventureState.map);
    const thresholds = calculateThreatThresholds(pathLength, scheme);
    const threatLevel = getCurrentThreatLevel();
    
    const threatIcons = ['🛡️', '⚔️', '💀'];
    
    // Используем шаблон
    const el = window.UI.renderTemplate('tpl-threat-indicator', {
        slots: { icon: threatIcons[threatLevel] || '🛡️' }
    });
    
    if (!el) return; // Если шаблона нет, ничего не рендерим (или фолбэк, но мы рассчитываем на шаблон)

    container.innerHTML = '';
    container.appendChild(el);

    // Настройка обработчика
    el.addEventListener('click', function(){ showThreatDetailsModal(daysInSector, threatLevel, thresholds, pathLength, scheme); });

    // Настройка зон и прогрессбара
    const maxDays = thresholds[2];
    const threshold0Percent = (thresholds[0] / maxDays) * 100;
    const threshold1Percent = (thresholds[1] / maxDays) * 100;
    const fillPercent = Math.min(100, (daysInSector / maxDays) * 100);

    const zone1 = el.querySelector('[data-role="zone0"]');
    const zone2 = el.querySelector('[data-role="zone1"]');
    const zone3 = el.querySelector('[data-role="zone2"]');
    const fillBar = el.querySelector('[data-role="fillBar"]');
    const marker = el.querySelector('[data-role="marker"]');
    const th1 = el.querySelector('[data-role="threshold1"]');
    const th2 = el.querySelector('[data-role="threshold2"]');
    const ticksContainer = el.querySelector('[data-role="ticks"]');

    if (zone1) zone1.style.width = threshold0Percent + '%';
    if (zone2) { zone2.style.left = threshold0Percent + '%'; zone2.style.width = (threshold1Percent - threshold0Percent) + '%'; }
    if (zone3) { zone3.style.left = threshold1Percent + '%'; zone3.style.width = (100 - threshold1Percent) + '%'; }

    if (fillBar) {
        fillBar.style.width = fillPercent + '%';
        // Класс уровня угрозы для цвета бара ставим на контейнер или сам бар
        el.classList.remove('threat-level-0', 'threat-level-1', 'threat-level-2');
        el.classList.add('threat-level-' + threatLevel);
    }

    if (marker) marker.style.left = fillPercent + '%';
    if (th1) th1.style.left = threshold0Percent + '%';
    if (th2) th2.style.left = threshold1Percent + '%';

    // Тики (риски)
    if (ticksContainer) {
        const cellCount = maxDays;
        const cellWidth = 100 / cellCount;
        for (let i = 0; i <= cellCount; i++) {
            const tick = document.createElement('div');
            tick.className = 'threat-tick' + (i % 5 === 0 ? ' major' : '');
            tick.style.left = (i * cellWidth) + '%';
            ticksContainer.appendChild(tick);
        }
    }
}

function showThreatDetailsModal(daysInSector, threatLevel, thresholds, pathLength, scheme){
    try {
        if (!window.UI || typeof window.UI.showModal !== 'function') return;
        
        const threatIcons = ['🛡️', '⚔️', '💀'];
        const levelNames = ['Нет угрозы', 'Умеренная угроза', 'Серьезная угроза'];
        const thresholdLabels = ['Нет угрозы', 'Умеренная угроза', 'Серьезная угроза'];
        
        const body = window.UI.renderTemplate('tpl-threat-details-modal', {
            slots: {
                bigIcon: threatIcons[threatLevel] || '🛡️',
                levelName: levelNames[threatLevel] || '',
                days: daysInSector
            }
        });
        
        if (!body) return;

        // Список порогов
        const list = body.querySelector('[data-role="thresholdList"]');
        if (list) {
            thresholds.forEach(function(threshold, index){
                const div = document.createElement('div');
                div.className = 'threat-threshold-item';
                div.innerHTML = `<span>${thresholdLabels[index]}:</span><span style="color:#cd853f; font-weight:600;">${threshold} дн.</span>`;
                list.appendChild(div);
            });
        }

        // Описание множителя
        const descEl = body.querySelector('[data-role="multiplierDesc"]');
        if (descEl) {
            const levels = Array.isArray(scheme.threatLevels) ? scheme.threatLevels : [1.0, 1.5, 2.0];
            const currentMultiplier = levels[threatLevel] || 1.0;
            if (threatLevel === 0) {
                descEl.textContent = 'Модификатор не применяется. Босс сражается с базовой силой.';
            } else {
                descEl.innerHTML = 'Количество юнитов босса умножено на <strong style="color:#cd853f; font-size:1.2em;">' + currentMultiplier + 'x</strong>';
            }
        }
        
        window.UI.showModal(body, { type: 'info', title: 'Уровень угрозы сектора' });
    } catch {}
}

async function showNodePreviewModal(nodeId) {
    try {
        const contents = Array.isArray(adventureState.nodeContents[nodeId]) ? adventureState.nodeContents[nodeId] : [];
        if (!window.UI || typeof window.UI.showModal !== 'function') {
            await movePlayerToNode(nodeId);
            adventureState.currentNodeId = nodeId;
            adventureState.resolvedNodeIds = Array.isArray(adventureState.resolvedNodeIds) ? adventureState.resolvedNodeIds : [];
            if (!adventureState.resolvedNodeIds.includes(nodeId)) {
                adventureState.resolvedNodeIds.push(nodeId);
            }
            adventureState.currentNodeContent = contents.slice();
            persistAdventure();
            renderAdventure();
            return;
        }
        
        const terrainNames = {
            'town': 'Город',
            'plain': 'Поля',
            'forest': 'Лес',
            'mountains': 'Горы'
        };
        
        const terrainEmojis = {
            'town': '🏰',
            'plain': '🌾',
            'forest': '🌲',
            'mountains': '🗻'
        };
        
        const node = adventureState.map && adventureState.map.nodes ? adventureState.map.nodes[nodeId] : null;
        const terrainType = node && node.terrainType ? node.terrainType : null;
        const travelDays = node && node.travelDays ? node.travelDays : 1;
        const terrainName = terrainType && terrainNames[terrainType] ? terrainNames[terrainType] : 'Местность';
        const terrainEmoji = terrainType && terrainEmojis[terrainType] ? terrainEmojis[terrainType] : '';
        
        function getDaysText(days) {
            const lastDigit = days % 10;
            const lastTwoDigits = days % 100;
            if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return days + ' дней';
            if (lastDigit === 1) return days + ' день';
            if (lastDigit >= 2 && lastDigit <= 4) return days + ' дня';
            return days + ' дней';
        }
        
        const body = window.UI.renderTemplate('tpl-node-preview-modal', {
            slots: {
                travelText: 'Время пути: ' + getDaysText(travelDays)
            }
        });
        
        if (!body) return;

        const travelInfo = body.querySelector('[data-role="travelInfo"]');
        const travelSep = body.querySelector('[data-role="travelSep"]');
        const emptyText = body.querySelector('[data-role="emptyText"]');
        const contentList = body.querySelector('[data-role="contentList"]');

        if (terrainType && travelDays) {
            if (travelInfo) travelInfo.style.display = '';
            if (travelSep) travelSep.style.display = '';
        }
        
        if (contents.length === 0) {
            if (emptyText) emptyText.style.display = '';
        } else {
            if (contentList) {
                contents.forEach(function(item) {
                    let icon = '';
                    let name = '';
                    
                    if (item.type === 'event') {
                        const ev = item.data;
                        icon = ev.icon || '✨';
                        name = item.data.name || item.data.id || 'Событие';
                    } else if (item.type === 'encounter') {
                        const enc = item.data;
                        icon = enc.icon || (enc.class === 'boss' ? '👑' : enc.class === 'elite' ? '💀' : '😡');
                        name = item.data.name || item.data.id || 'Энкаунтер';
                    } else if (item.type === 'raid') {
                        const raid = item.data;
                        icon = raid.icon || '⚔️';
                        name = item.data.name || item.data.id || 'Рейд';
                    } else {
                        name = item.data.id || 'Энкаунтер';
                    }

                    const card = window.UI.renderTemplate('tpl-node-content-card', {
                        slots: { icon: icon, name: name }
                    });
                    
                    if (card) contentList.appendChild(card);
                });
            }
        }
        
        const h = window.UI.showModal(body, { type: 'dialog', title: '', yesText: 'Перейти', noText: 'Закрыть' });
        
        setTimeout(function() {
            const titleEl = document.querySelector('.modal-title');
            if (titleEl && terrainEmoji) {
                titleEl.innerHTML = '';
                titleEl.style.display = 'flex';
                titleEl.style.alignItems = 'center';
                titleEl.style.justifyContent = 'center';
                titleEl.style.gap = '8px';
                const iconSpan = document.createElement('span');
                iconSpan.textContent = terrainEmoji;
                iconSpan.style.fontSize = '1.5em';
                const textSpan = document.createElement('span');
                textSpan.textContent = terrainName;
                titleEl.appendChild(iconSpan);
                titleEl.appendChild(textSpan);
            } else if (titleEl) {
                titleEl.textContent = terrainName;
            }
        }, 0);
        
        const proceed = await h.closed;
        if (proceed) {
            adventureState.currentNodeContent = [];
            adventureState.currentNodeContent = contents.slice();
            await movePlayerToNode(nodeId);
            adventureState.currentNodeId = nodeId;
            adventureState.resolvedNodeIds = Array.isArray(adventureState.resolvedNodeIds) ? adventureState.resolvedNodeIds : [];
            if (!adventureState.resolvedNodeIds.includes(nodeId)) {
                adventureState.resolvedNodeIds.push(nodeId);
            }
            persistAdventure();
            renderAdventure();
        }
    } catch (e) {
        console.error(e);
        // Фолбэк в случае ошибки UI
        await movePlayerToNode(nodeId);
        adventureState.currentNodeId = nodeId;
        adventureState.resolvedNodeIds = Array.isArray(adventureState.resolvedNodeIds) ? adventureState.resolvedNodeIds : [];
        if (!adventureState.resolvedNodeIds.includes(nodeId)) {
            adventureState.resolvedNodeIds.push(nodeId);
        }
        persistAdventure();
        renderAdventure();
    }
}

window.getGraphNodePos = getGraphNodePos;
window.renderMapBoard = renderMapBoard;
window.renderThreatLevelIndicator = renderThreatLevelIndicator;
window.showThreatDetailsModal = showThreatDetailsModal;
window.showNodePreviewModal = showNodePreviewModal;

