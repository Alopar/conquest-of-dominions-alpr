import { callIfExists } from './errorHandler.js';

// Создание юнита из конфигурации
export function createUnit(typeId, unitId) {
    if (!window.battleConfig || !window.battleConfig.unitTypes || !window.battleConfig.unitTypes[typeId]) {
        console.error(`Тип юнита ${typeId} не найден в конфигурации`);
        return null;
    }
    const type = window.battleConfig.unitTypes[typeId];
    const role = (function(){ const v = (type && type.type ? String(type.type).toLowerCase() : 'melee'); return (v==='range'||v==='support')?v:'melee'; })();
    const baseHp = type.hp;
    const bonusHp = callIfExists('Modifiers', 'getHpBonus', [unitId && String(unitId).startsWith('defender_') ? 'defenders' : 'attackers', role], 0);
    const effectiveHp = Math.max(1, Number(baseHp) + Number(bonusHp || 0));
    // Применяем бонус к урону добавлением граней (для любых ролей)
    let effDamage = String(type.damage || '1d1');
    var side = (unitId && String(unitId).startsWith('defender_')) ? 'defenders' : 'attackers';
    var dmgBonus = callIfExists('Modifiers', 'getDamageBonus', [side, role], 0);
    if (dmgBonus > 0) {
        var match = effDamage.match(/(\d+)d(\d+)/);
        if (match) {
            var count = parseInt(match[1]);
            var sides = parseInt(match[2]);
            effDamage = count + 'd' + Math.max(1, sides + dmgBonus);
        }
    }
    var effTargets = Math.max(1, Number(type.targets || 1));
    var tSide = (unitId && String(unitId).startsWith('defender_')) ? 'defenders' : 'attackers';
    var tBonus = callIfExists('Modifiers', 'getTargetsBonus', [tSide, role], 0);
    effTargets = Math.max(1, effTargets + tBonus);
    return {
        id: unitId,
        typeId: typeId,
        name: type.name,
        hp: effectiveHp,
        maxHp: effectiveHp,
        damage: effDamage,
        targets: effTargets,
        view: type.view,
        hasAttackedThisTurn: false,
        alive: true
    };
}


