/**
 * @param {Object} unit
 * @returns {'melee'|'range'|'support'}
 */
export function getUnitRole(unit) {
    var types = (window.battleConfig && window.battleConfig.unitTypes) ? window.battleConfig.unitTypes : {};
    var t = types[unit.typeId];
    var v = t && t.type ? String(t.type).toLowerCase() : 'melee';
    if (v === 'melee' || v === 'range' || v === 'support') return v;
    return 'melee';
}

/**
 * @param {Object} attacker
 * @param {Array<Object>} aliveEnemies
 * @returns {Object|null}
 */
export function selectTargetByRules(attacker, aliveEnemies) {
    if (!attacker || !Array.isArray(aliveEnemies) || aliveEnemies.length === 0) return null;
    
    var frontLineEnemies = aliveEnemies.filter(function(e) { return e.line === 1; });
    
    if (frontLineEnemies.length > 0) {
        return frontLineEnemies[Math.floor(Math.random() * frontLineEnemies.length)];
    }
    
    return aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
}

