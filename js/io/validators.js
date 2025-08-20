function validateBattleConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Неверная структура battle_setup');
    if (!config.armies || !config.armies.attackers || !config.armies.defenders) {
        throw new Error('Отсутствуют армии attackers/defenders');
    }
}

function validateAdventureConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') throw new Error('Неверная структура adventure_config');
    if (!cfg.adventure || !Array.isArray(cfg.stages)) { throw new Error('Отсутствуют adventure/stages'); }
    if (cfg.adventure.startingCurrencies && !Array.isArray(cfg.adventure.startingCurrencies)) throw new Error('startingCurrencies должен быть массивом');
    cfg.stages.forEach(function(st){
        if (!st || typeof st.id !== 'string' || !Array.isArray(st.encounterIds)) throw new Error('Стадия должна содержать id и encounterIds');
    });
}

function validateEncountersConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.encounters)) throw new Error('Неверная структура encounters_config');
    cfg.encounters.forEach(function(e){
        if (!e || typeof e.id !== 'string') throw new Error('Встреча должна содержать id');
        if (typeof e.shortName !== 'string' || typeof e.description !== 'string') throw new Error('Встреча должна содержать shortName и description');
        if (!Array.isArray(e.monsters)) throw new Error('Встреча должна содержать monsters');
        if (e.rewards && !Array.isArray(e.rewards)) throw new Error('rewards должен быть массивом');
    });
}

function validateCurrenciesConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.currencies)) throw new Error('Неверная структура currencies_config');
    cfg.currencies.forEach(function(c){ if (!c || typeof c.id !== 'string' || typeof c.name !== 'string') throw new Error('Валюта должна содержать id и name'); });
}

function validateRewardsConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.rewards)) throw new Error('Неверная структура rewards_config');
    cfg.rewards.forEach(function(r){
        if (!r || typeof r.id !== 'string' || typeof r.type !== 'string') throw new Error('Награда должна содержать id и type');
        if (r.type === 'currency') {
            if (typeof r.currencyId !== 'string' || typeof r.amount !== 'number') throw new Error('Награда-валюта должна содержать currencyId и amount');
        } else if (r.type === 'monster') {
            if (typeof r.monsterId !== 'string' || typeof r.count !== 'number') throw new Error('Награда-монстр должна содержать monsterId и count');
        }
    });
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
window.validateEncountersConfig = validateEncountersConfig;
window.validateCurrenciesConfig = validateCurrenciesConfig;
window.validateRewardsConfig = validateRewardsConfig;
function validateHeroClassesConfig(cfg) {
    const list = Array.isArray(cfg) ? cfg : (cfg && Array.isArray(cfg.classes) ? cfg.classes : null);
    if (!list) throw new Error('Неверная структура hero_classes');
    list.forEach(function(c){
        if (!c || typeof c.id !== 'string' || typeof c.name !== 'string') throw new Error('Класс героя должен содержать id и name');
        if (!Array.isArray(c.startingArmy)) throw new Error('Класс героя должен содержать startingArmy');
        c.startingArmy.forEach(function(g){ if (!g || typeof g.id !== 'string' || typeof g.count !== 'number') throw new Error('Некорректная запись startingArmy'); });
    });
}
window.validateHeroClassesConfig = validateHeroClassesConfig;
