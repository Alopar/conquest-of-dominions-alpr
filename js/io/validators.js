function validateBattleConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Неверная структура battle_setup');
    if (!config.armies || !config.armies.attackers || !config.armies.defenders) {
        throw new Error('Отсутствуют армии attackers/defenders');
    }
}

function validateAdventureConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') throw new Error('Неверная структура adventure_config');
    if (!cfg.adventure || !Array.isArray(cfg.startingArmy) || !Array.isArray(cfg.encounters)) {
        throw new Error('Отсутствуют adventure/startingArmy/encounters');
    }
}

function validateMonstersConfig(cfg) {
    const src = (cfg && cfg.unitTypes) ? cfg.unitTypes : cfg;
    if (!src || typeof src !== 'object') throw new Error('Неверная структура monsters_config');
}

function validateMercenariesConfig(cfg) {
    const list = Array.isArray(cfg) ? cfg : (cfg && Array.isArray(cfg.mercenaries) ? cfg.mercenaries : null);
    if (!list) throw new Error('Неверная структура mercenaries_config');
    for (const it of list) {
        if (!it || typeof it.id !== 'string') throw new Error('Некорректный наёмник в mercenaries_config');
        if (it.price != null && typeof it.price !== 'number') throw new Error('Некорректная цена наёмника в mercenaries_config');
    }
}

window.validateBattleConfig = validateBattleConfig;
window.validateAdventureConfig = validateAdventureConfig;
window.validateMonstersConfig = validateMonstersConfig;
window.validateMercenariesConfig = validateMercenariesConfig;
