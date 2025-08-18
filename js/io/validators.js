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
    if (!cfg.shop || !Array.isArray(cfg.shop.mercenaries)) {
        // Поддерживаем наличие магазина на этапе миграции; если его нет — считаем список наёмников пустым
        cfg.shop = cfg.shop || { mercenaries: [] };
    }
}

function validateMonstersConfig(cfg) {
    const src = (cfg && cfg.unitTypes) ? cfg.unitTypes : cfg;
    if (!src || typeof src !== 'object') throw new Error('Неверная структура monsters_config');
}

window.validateBattleConfig = validateBattleConfig;
window.validateAdventureConfig = validateAdventureConfig;
window.validateMonstersConfig = validateMonstersConfig;
