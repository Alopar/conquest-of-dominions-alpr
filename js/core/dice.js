/**
 * @param {number} sides
 * @returns {number}
 */
export function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * @param {string} damageStr
 * @returns {number}
 */
export function parseDamage(damageStr) {
    var match = damageStr.match(/(\d+)d(\d+)/);
    if (match) {
        var count = parseInt(match[1]);
        var sides = parseInt(match[2]);
        var total = 0;
        for (var i = 0; i < count; i++) {
            total += rollDice(sides);
        }
        return total;
    }
    return 1;
}

/**
 * @param {string} damageStr
 * @returns {number}
 */
export function getMaxDamageValue(damageStr) {
    var match = damageStr && typeof damageStr === 'string' ? damageStr.match(/(\d+)d(\d+)/) : null;
    if (match) {
        var count = parseInt(match[1]);
        var sides = parseInt(match[2]);
        if (Number.isFinite(count) && Number.isFinite(sides) && count > 0 && sides > 0) {
            return count * sides;
        }
    }
    return 1;
}

