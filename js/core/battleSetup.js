import { createUnit } from './unitFactory.js';
import { arrangeUnitsIntoFormation } from './combat.js';
import { assignLinesToArmy } from './formations.js';

export function getFirstSide(cfg) {
    const safeCfg = cfg || (window.battleConfig && window.battleConfig.battleConfig) || {};
    return (safeCfg.defendersStart === false) ? 'attackers' : 'defenders';
}

// Инициализация армий из конфигурации
export function initializeArmies() {
    if (!window.battleConfig) {
        console.error('Конфигурация не загружена');
        return;
    }

    window.gameState.attackers = [];
    window.gameState.defenders = [];

    let unitIdCounter = 0;

    // Создание атакующих из конфигурации (без ограничения по количеству)
    for (const unitGroup of window.battleConfig.armies.attackers.units) {
        for (let i = 0; i < unitGroup.count; i++) {
            const unit = createUnit(unitGroup.id, `attacker_${unitIdCounter++}`);
            if (unit) window.gameState.attackers.push(unit);
        }
    }
    // Формирование построения атакующих
    window.gameState.attackers = arrangeUnitsIntoFormation(window.gameState.attackers);
    
    const perRow = Math.max(1, Number((window.getCurrentSettings && window.getCurrentSettings() && window.getCurrentSettings().unitsPerRow) || 10));
    assignLinesToArmy(window.gameState.attackers, perRow);

    // Создание защитников из конфигурации (без ограничения по количеству)
    for (const unitGroup of window.battleConfig.armies.defenders.units) {
        for (let i = 0; i < unitGroup.count; i++) {
            const unit = createUnit(unitGroup.id, `defender_${unitIdCounter++}`);
            if (unit) window.gameState.defenders.push(unit);
        }
    }
    // Формирование построения защитников
    window.gameState.defenders = arrangeUnitsIntoFormation(window.gameState.defenders);
    assignLinesToArmy(window.gameState.defenders, perRow);

    window.gameState.battleEnded = false;
    window.gameState.battleLog = [];
    window.gameState.currentTurn = 1;
    window.gameState._rebuildInProgress = false;

    // Устанавливаем активную сторону согласно конфигу боя (по умолчанию защитники)
    window.gameState.activeSide = getFirstSide(window.battleConfig && window.battleConfig.battleConfig);

    const logDiv = document.getElementById('battle-log');
    if (logDiv) {
        logDiv.innerHTML = '';
    }
}


