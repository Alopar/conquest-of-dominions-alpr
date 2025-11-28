/**
 * @fileoverview Модуль навигации по карте приключения
 */

/**
 * @returns {number}
 */
function getSectorCount() {
    var s = adventureState && adventureState.config && adventureState.config.sectors;
    return Array.isArray(s) ? s.length : 0;
}

/**
 * @param {number} index
 * @returns {number}
 */
function getSectorNumberByIndex(index) {
    var s = adventureState && adventureState.config && adventureState.config.sectors;
    if (Array.isArray(s) && s[index] && typeof s[index].number === 'number') return s[index].number;
    return index + 1;
}

/**
 * @param {number} sectorNumber
 * @returns {Object|null}
 */
function getPathSchemeForSector(sectorNumber) {
    return safeCall(function() {
        var ps = (window.StaticData && window.StaticData.getConfig) ? window.StaticData.getConfig('pathSchemes') : null;
        var list = ps && Array.isArray(ps.schemes) ? ps.schemes : [];
        return list.find(function(x) { return x && x.sector === sectorNumber; }) || null;
    }, null, 'getPathSchemeForSector');
}

/**
 * @param {Object} map
 * @returns {number}
 */
function calculatePathLength(map) {
    if (!map || !map.nodes) return 0;
    var nodes = Object.values(map.nodes);
    if (nodes.length === 0) return 0;
    var maxX = Math.max.apply(null, nodes.map(function(n) { return n.x || 0; }));
    return maxX;
}

/**
 * @param {number} pathLength
 * @param {Object} scheme
 * @returns {Array<number>}
 */
function calculateThreatThresholds(pathLength, scheme) {
    var multipliers = Array.isArray(scheme && scheme.threatDayMultipliers) ? scheme.threatDayMultipliers : [1.0, 1.25, 1.5];
    var additions = Array.isArray(scheme && scheme.threatDayAdditions) ? scheme.threatDayAdditions : [3, 5, 5];
    return [
        Math.floor(pathLength * multipliers[0] + additions[0]),
        Math.floor(pathLength * multipliers[1] + additions[1]),
        Math.floor(pathLength * multipliers[2] + additions[2])
    ];
}

/**
 * @returns {number}
 */
function getCurrentThreatLevel() {
    if (!adventureState.sectorStartDay) return 0;
    var currentDay = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
    var daysInSector = currentDay - adventureState.sectorStartDay;
    var sectorNumber = getSectorNumberByIndex(adventureState.currentStageIndex || 0);
    var scheme = getPathSchemeForSector(sectorNumber);
    if (!scheme) return 0;
    var map = adventureState.map;
    if (!map) return 0;
    var pathLength = calculatePathLength(map);
    var thresholds = calculateThreatThresholds(pathLength, scheme);
    if (daysInSector <= thresholds[0]) return 0;
    if (daysInSector <= thresholds[1]) return 1;
    if (daysInSector <= thresholds[2]) return 2;
    return 2;
}

/**
 * @returns {number}
 */
function getThreatMultiplier() {
    var sectorNumber = getSectorNumberByIndex(adventureState.currentStageIndex || 0);
    var scheme = getPathSchemeForSector(sectorNumber);
    if (!scheme) return 1.0;
    var levels = Array.isArray(scheme.threatLevels) ? scheme.threatLevels : [1.0, 1.5, 2.0];
    var threatLevel = getCurrentThreatLevel();
    return levels[threatLevel] || 1.0;
}

/**
 * @param {number} count
 */
function ensureSectorSeeds(count) {
    adventureState.sectorSeeds = Array.isArray(adventureState.sectorSeeds) ? adventureState.sectorSeeds : [];
    for (var i = adventureState.sectorSeeds.length; i < count; i++) {
        adventureState.sectorSeeds[i] = Date.now() + i * 7919;
    }
}

/**
 * @param {number} index
 */
function generateSectorMap(index) {
    var total = getSectorCount();
    adventureState.sectorCount = total;
    ensureSectorSeeds(total);
    var sectorNumber = getSectorNumberByIndex(index);
    var scheme = getPathSchemeForSector(sectorNumber);
    if (!scheme) throw new Error('Не найдена схема пути для сектора ' + sectorNumber);
    var gen = {
        columns: Array.isArray(scheme.columns) ? scheme.columns : [],
        edgeDensity: (scheme.edgeDensity != null) ? scheme.edgeDensity : 0.5
    };
    var cfg = { mapGen: gen };
    var seed = adventureState.sectorSeeds[index] || Date.now();
    var map = (window.AdventureGraph && typeof window.AdventureGraph.generateAdventureMap === 'function') ? window.AdventureGraph.generateAdventureMap(cfg, seed) : null;
    adventureState.map = map;
    adventureState.currentNodeId = map && map.startId;
    adventureState.resolvedNodeIds = map && map.startId ? [map.startId] : [];
    if (map && map.nodeContents) {
        adventureState.nodeContents = map.nodeContents;
    } else {
        adventureState.nodeContents = {};
    }
    adventureState.currentNodeContent = [];
    var currentDay = (window.AdventureTime && typeof window.AdventureTime.getCurrentDay === 'function') ? window.AdventureTime.getCurrentDay() : 1;
    adventureState.sectorStartDay = currentDay;
    adventureState.sectorThreatLevel = 0;
    safeCall(function() {
        if (window.Raids && typeof window.Raids.clearNonStarted === 'function') window.Raids.clearNonStarted();
    }, undefined, 'generateSectorMap:clearRaids');
    persistAdventure();
}

/**
 * @returns {boolean}
 */
function isCurrentSectorCleared() {
    var map = adventureState.map;
    if (!map || !map.nodes) return false;
    var bossIds = Object.keys(map.nodes).filter(function(id) { var n = map.nodes[id]; return n && n.type === 'boss'; });
    if (bossIds.length === 0) return false;
    return bossIds.every(function(id) { return Array.isArray(adventureState.resolvedNodeIds) && adventureState.resolvedNodeIds.includes(id); });
}

/**
 * @returns {Promise<boolean>}
 */
async function advanceToNextSectorWithModal() {
    var idx = Number(adventureState.currentStageIndex || 0);
    var total = Number(adventureState.sectorCount || getSectorCount() || 0);
    var hasNext = idx + 1 < total;
    if (!hasNext) return false;
    var nextNum = getSectorNumberByIndex(idx + 1);
    await safeAsync((async function() {
        if (window.UI && typeof window.UI.showModal === 'function') {
            var body = document.createElement('div');
            body.style.textAlign = 'center';
            body.style.padding = '6px 4px';
            var p1 = document.createElement('div');
            p1.textContent = 'Впереди следующая локация: ' + nextNum + ' 🌍';
            body.appendChild(p1);
            var h = window.UI.showModal(body, { type: 'confirm', title: 'Путь пройден!' });
            await h.closed;
        }
    })(), undefined, 'advanceToNextSectorWithModal:modal');
    adventureState.currentStageIndex = idx + 1;
    generateSectorMap(adventureState.currentStageIndex);
    await showAdventure();
    return true;
}

/**
 * @param {boolean} on
 */
function setAdventureInputBlock(on) {
    var layer = document.getElementById('adventure-input-blocker');
    if (!layer) {
        var scr = document.getElementById('adventure-screen');
        if (scr) {
            layer = document.createElement('div');
            layer.id = 'adventure-input-blocker';
            scr.appendChild(layer);
        }
    }
    if (layer) {
        layer.style.opacity = on ? '0.15' : '0';
        layer.style.pointerEvents = on ? 'auto' : 'none';
    }
}

/**
 * @param {string} nodeId
 * @returns {{x: number, y: number}}
 */
function getGraphNodePos(nodeId) {
    var map = adventureState.map;
    if (!map) return { x: 0, y: 0 };
    var n = map.nodes[nodeId];
    if (!n) return { x: 0, y: 0 };
    var colW = 160, colH = 120, padX = 120, padY = 120;
    return { x: padX + n.x * colW, y: padY + n.y * colH };
}

/**
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @param {number} [durationMs]
 * @returns {Promise<void>}
 */
function movePlayerMarker(from, to, durationMs) {
    return new Promise(function(resolve) {
        var el = document.getElementById('adv-player');
        if (!el) { resolve(); return; }
        var start = performance.now();
        var duration = durationMs || getAdventureMoveDurationMs();
        function tick(t) {
            var k = Math.min(1, (t - start) / Math.max(1, duration));
            var x = from.x + (to.x - from.x) * k;
            var y = from.y + (to.y - from.y) * k;
            el.setAttribute('transform', 'translate(' + x + ',' + y + ')');
            if (k < 1) requestAnimationFrame(tick);
            else resolve();
        }
        requestAnimationFrame(tick);
    });
}

/**
 * @param {string} nodeId
 * @returns {Promise<void>}
 */
async function movePlayerToNode(nodeId) {
    function getPos(id) {
        var m = adventureState.map;
        if (!m) return null;
        try { if (m._posOf && m._posOf[id]) return m._posOf[id]; } catch(e) {}
        return getGraphNodePos(id);
    }
    var from = getPos(adventureState.currentNodeId);
    var to = getPos(nodeId);
    adventureState.movingToNodeId = nodeId;
    persistAdventure();
    setAdventureInputBlock(true);
    await movePlayerMarker(from, to, getAdventureMoveDurationMs());
    setAdventureInputBlock(false);

    var map = adventureState.map;
    var node = map && map.nodes ? map.nodes[nodeId] : null;
    if (node && node.terrainType && node.travelDays && nodeId !== adventureState.currentNodeId && node.type !== 'start') {
        safeCall(function() {
            if (window.AdventureTime && typeof window.AdventureTime.addDays === 'function') {
                window.AdventureTime.addDays(node.travelDays);
            }
        }, undefined, 'movePlayerToNode:addDays');
    }

    adventureState.currentNodeId = nodeId;
    adventureState.sectorThreatLevel = getCurrentThreatLevel();
    persistAdventure();

    safeCall(function() {
        var board = document.getElementById('adventure-map-board');
        if (board && to) {
            var left = Math.max(0, Math.min(board.scrollWidth - board.clientWidth, Math.round(to.x - board.clientWidth * 0.5)));
            var top = Math.max(0, Math.min(board.scrollHeight - board.clientHeight, Math.round(to.y - board.clientHeight * 0.5)));
            board.scrollLeft = left;
            board.scrollTop = top;
        }
    }, undefined, 'movePlayerToNode:scroll');
    adventureState.movingToNodeId = undefined;
    persistAdventure();
    renderThreatLevelIndicator();
    renderNodeContentItems();
}

/**
 * @param {string} nodeId
 */
async function onGraphNodeClick(nodeId) {
    var map = adventureState.map;
    if (!map || !map.nodes) return;
    var mapState = { map: map, currentNodeId: adventureState.currentNodeId, resolvedNodeIds: adventureState.resolvedNodeIds };
    var available = window.AdventureGraph && window.AdventureGraph.isNodeAvailable ? window.AdventureGraph.isNodeAvailable(mapState, nodeId) : false;
    if (!available) return;
    await movePlayerToNode(nodeId);
    adventureState.currentNodeId = nodeId;
    persistAdventure();
    resolveGraphNode(nodeId);
}

window.getSectorCount = getSectorCount;
window.getSectorNumberByIndex = getSectorNumberByIndex;
window.getPathSchemeForSector = getPathSchemeForSector;
window.calculatePathLength = calculatePathLength;
window.calculateThreatThresholds = calculateThreatThresholds;
window.getCurrentThreatLevel = getCurrentThreatLevel;
window.getThreatMultiplier = getThreatMultiplier;
window.ensureSectorSeeds = ensureSectorSeeds;
window.generateSectorMap = generateSectorMap;
window.isCurrentSectorCleared = isCurrentSectorCleared;
window.advanceToNextSectorWithModal = advanceToNextSectorWithModal;
window.setAdventureInputBlock = setAdventureInputBlock;
window.getGraphNodePos = getGraphNodePos;
window.movePlayerMarker = movePlayerMarker;
window.movePlayerToNode = movePlayerToNode;
window.onGraphNodeClick = onGraphNodeClick;

