import { getUnitRole } from './targeting.js';

export function assignLinesToArmy(units, perRow) {
    if (!Array.isArray(units) || units.length === 0) return units;
    
    const remaining = units.slice();
    const rows = [];
    
    function strength(u) {
        const hp = Number(u.maxHp || u.hp || 0);
        const dmg = (typeof u.damage === 'number') ? u.damage : 0;
        return { hp, dmg };
    }
    
    function sortByStrengthDesc(a, b) {
        const sa = strength(a);
        const sb = strength(b);
        if (sb.hp !== sa.hp) return sb.hp - sa.hp;
        return sb.dmg - sa.dmg;
    }
    
    const hasMeleeInArmy = remaining.some(u => (getUnitRole ? getUnitRole(u) : 'melee') === 'melee');
    
    function takeNextRow(isFirstLine) {
        const melee = remaining.filter(u => (getUnitRole ? getUnitRole(u) : 'melee') === 'melee').sort(sortByStrengthDesc);
        const range = remaining.filter(u => (getUnitRole ? getUnitRole(u) : 'melee') === 'range').sort(sortByStrengthDesc);
        const support = remaining.filter(u => (getUnitRole ? getUnitRole(u) : 'melee') === 'support').sort(sortByStrengthDesc);
        const row = [];
        
        function pull(from) {
            while (from.length > 0 && row.length < perRow) row.push(from.shift());
        }
        
        if (isFirstLine && hasMeleeInArmy) {
            pull(melee);
        } else {
            pull(melee);
            if (row.length < perRow) pull(range);
            if (row.length < perRow) pull(support);
        }
        
        const used = new Set(row.map(u => u.id));
        for (let i = remaining.length - 1; i >= 0; i--) {
            if (used.has(remaining[i].id)) remaining.splice(i, 1);
        }
        return row;
    }
    
    let isFirstLine = true;
    while (remaining.length > 0) {
        rows.push(takeNextRow(isFirstLine));
        isFirstLine = false;
    }
    
    for (let lineNum = 0; lineNum < rows.length; lineNum++) {
        for (const unit of rows[lineNum]) {
            unit.line = lineNum + 1;
        }
    }
    
    return units;
}

export function rebuildArmyLines(armyUnits, perRow) {
    const alive = armyUnits.filter(u => u.alive);
    return assignLinesToArmy(alive, perRow);
}


