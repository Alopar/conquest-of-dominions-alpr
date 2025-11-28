import { safeCall, callIfExists } from './errorHandler.js';
import { eventBus } from './eventBus.js';
import { rollDice, parseDamage, getMaxDamageValue } from './dice.js';
import { getUnitRole, selectTargetByRules } from './targeting.js';
import { selectNextTarget, applyDamageToTarget, rollToHit } from './combat.js';
import { rebuildArmyLines } from './formations.js';
import { getFirstSide, initializeArmies } from './battleSetup.js';

// Логика боя
export function executeStep(army) {
    if (window.gameState.battleEnded) return;

    const units = army === 'attackers' ? window.gameState.attackers : window.gameState.defenders;
    const enemies = army === 'attackers' ? window.gameState.defenders : window.gameState.attackers;

    // Находим живых юнитов, которые еще не атаковали
    const availableUnits = units.filter(unit => unit.alive && !unit.hasAttackedThisTurn);

    if (availableUnits.length === 0) {
        if (window.addToLog) window.addToLog(`Все ${army === 'attackers' ? 'атакующие' : 'защитники'} уже атаковали в этом ходу`);
        return;
    }

    // Выбираем случайного юнита для атаки
    const attacker = availableUnits[Math.floor(Math.random() * availableUnits.length)];

    // Находим живых врагов
    const aliveEnemies = enemies.filter(unit => unit.alive);

    if (aliveEnemies.length === 0) {
        if (window.addToLog) window.addToLog(`Все ${army === 'attackers' ? 'защитники' : 'атакующие'} уже мертвы!`);
        endBattle(army);
        return;
    }

    // Выбираем цель по правилам ролей
    const target = selectTargetByRules(attacker, aliveEnemies);

    // Выполняем атаку
    performAttack(attacker, target, army);

    // Отмечаем, что юнит атаковал
    attacker.hasAttackedThisTurn = true;

    // Обновляем отображение
    if (window.renderArmies) window.renderArmies();

    // Проверяем, закончился ли бой
    checkBattleEnd();
}

export function step() {
    if (window.gameState.battleEnded) return;

    // Текущие настройки
    const currentSettings = window.getCurrentSettings ? window.getCurrentSettings() : {};
    const alternate = !!(currentSettings && currentSettings.battleSettings && currentSettings.battleSettings.attackAlternate);

    // Помечаем юнитов, которые не могут ходить (melee не из первой линии)
    window.gameState.attackers.forEach(u => {
        if (u.alive && !u.hasAttackedThisTurn) {
            const role = getUnitRole(u);
            if (role === 'melee' && u.line !== 1) {
                u.hasAttackedThisTurn = true;
            }
        }
    });
    window.gameState.defenders.forEach(u => {
        if (u.alive && !u.hasAttackedThisTurn) {
            const role = getUnitRole(u);
            if (role === 'melee' && u.line !== 1) {
                u.hasAttackedThisTurn = true;
            }
        }
    });

    // Подсчитываем доступных к атаке (теперь это просто живые, которые еще не ходили)
    const attackersAvailable = window.gameState.attackers.filter(u => u.alive && !u.hasAttackedThisTurn);
    const defendersAvailable = window.gameState.defenders.filter(u => u.alive && !u.hasAttackedThisTurn);

    // Если нет доступных действий – автоматически переходим к следующему ходу
    if (attackersAvailable.length === 0 && defendersAvailable.length === 0) {
        nextTurn();
        return;
    }

    // Определяем активную сторону (если текущая сторона не может действовать — переключаемся)
    let side = window.gameState.activeSide || 'defenders';
    let available = side === 'attackers' ? attackersAvailable : defendersAvailable;
    if (available.length === 0) {
        side = side === 'attackers' ? 'defenders' : 'attackers';
        window.gameState.activeSide = side;
        available = side === 'attackers' ? attackersAvailable : defendersAvailable;
        if (available.length === 0) {
            nextTurn();
            return;
        }
    }

    // Выбираем атакующего и цель
    const attacker = available[Math.floor(Math.random() * available.length)];
    const enemies = side === 'attackers' ? window.gameState.defenders : window.gameState.attackers;
    const aliveEnemies = enemies.filter(u => u.alive);
    if (aliveEnemies.length === 0) {
        endBattle(side);
        return;
    }
    const target = selectTargetByRules(attacker, aliveEnemies);

    // Атака
    performAttack(attacker, target, side);
    attacker.hasAttackedThisTurn = true;

    // Переключение активной стороны в зависимости от режима
    if (alternate) {
        window.gameState.activeSide = (side === 'attackers') ? 'defenders' : 'attackers';
    } else {
        // Остаемся на стороне, пока у нее есть доступные юниты, иначе переключаемся
        const stillHas = (side === 'attackers' ? window.gameState.attackers : window.gameState.defenders)
            .some(u => u.alive && !u.hasAttackedThisTurn);
        if (!stillHas) {
            window.gameState.activeSide = (side === 'attackers') ? 'defenders' : 'attackers';
        }
    }

    // Обновляем UI и проверяем конец боя
    if (window.renderArmies) window.renderArmies();
    checkBattleEnd();
}

function performAttack(attacker, target, army) {
    const currentSettings = window.getCurrentSettings ? window.getCurrentSettings() : {};
    const meleeHit = Number(currentSettings.meleeHitThreshold ?? 5);
    const rangeHit = Number(currentSettings.rangeHitThreshold ?? 11);

    const role = getUnitRole(attacker);

    const attempts = Math.max(1, Number(attacker.targets || 1));
    const actedTargets = new Set();
    for (let i = 0; i < attempts; i++) {
        if (window.queueAnimation && window.anim) window.queueAnimation(window.anim.attack(attacker.id, army));
        const enemies = army === 'attackers' ? window.gameState.defenders : window.gameState.attackers;
        const currentTarget = selectNextTarget(attacker, enemies, actedTargets);
        if (!currentTarget) break;
        actedTargets.add(currentTarget.id);

        if (role === 'support') {
            const damage = parseDamage(attacker.damage);
            if (window.addToLog) window.addToLog(`⚡ ${attacker.name} атакует ${currentTarget.name} (${damage} урона)`);
            if (eventBus) eventBus.emit('combat:hit', { attacker, target: currentTarget, damage, crit: false, role, army });
            applyDamageToTarget(currentTarget, damage, (window.HitColor ? window.HitColor.Yellow : 'yellow'), army === 'attackers' ? 'defenders' : 'attackers');
            continue;
        }

        const hit = rollToHit(role, meleeHit, rangeHit);
        if (hit.isCrit) {
            const damage = getMaxDamageValue(attacker.damage) * 2;
            if (window.addToLog) window.addToLog(`🎯 ${attacker.name} наносит критический удар ${currentTarget.name} (${damage} урона)!`);
            if (eventBus) eventBus.emit('combat:hit', { attacker, target: currentTarget, damage, crit: true, role, army });
            applyDamageToTarget(currentTarget, damage, (role === 'support' ? (window.HitColor ? window.HitColor.Yellow : 'yellow') : (window.HitColor ? window.HitColor.Red : 'red')), army === 'attackers' ? 'defenders' : 'attackers');
            continue;
        }

        if (hit.isHit) {
            const damage = parseDamage(attacker.damage);
            if (window.addToLog) window.addToLog(`⚔️ ${attacker.name} атакует ${currentTarget.name} (${damage} урона)`);
            if (eventBus) eventBus.emit('combat:hit', { attacker, target: currentTarget, damage, crit: false, role, army });
            applyDamageToTarget(currentTarget, damage, (role === 'support' ? (window.HitColor ? window.HitColor.Yellow : 'yellow') : (window.HitColor ? window.HitColor.Red : 'red')), army === 'attackers' ? 'defenders' : 'attackers');
        } else {
            if (window.addToLog) window.addToLog(`❌ ${attacker.name} промахивается по ${currentTarget.name}`);
            if (window.queueAnimation && window.anim) window.queueAnimation(window.anim.dodge(currentTarget.id, army === 'attackers' ? 'defenders' : 'attackers'));
            if (eventBus) eventBus.emit('combat:miss', { attacker, target: currentTarget, role, army });
        }
    }
}

export function nextTurn() {
    if (window.gameState.battleEnded) return;
    
    if (window.gameState._rebuildInProgress) return;
    window.gameState._rebuildInProgress = true;

    const currentSettings = window.getCurrentSettings ? window.getCurrentSettings() : {};
    const perRow = Math.max(1, Number((currentSettings && currentSettings.unitsPerRow) || 10));

    const deadAttackers = window.gameState.attackers.filter(u => !u.alive);
    const deadDefenders = window.gameState.defenders.filter(u => !u.alive);
    
    if (deadAttackers.length > 0 || deadDefenders.length > 0) {
        deadAttackers.forEach(u => {
            if (window.queueAnimation && window.anim) {
                window.queueAnimation(window.anim.fadeout(u.id, 'attackers'));
            }
        });
        deadDefenders.forEach(u => {
            if (window.queueAnimation && window.anim) {
                window.queueAnimation(window.anim.fadeout(u.id, 'defenders'));
            }
        });
        
        if (window.applyPendingAnimations) window.applyPendingAnimations();
        
        const fadeoutDelay = window.scaleTime ? window.scaleTime(350) : 350;
        setTimeout(() => {
            continueNextTurn(perRow);
        }, fadeoutDelay);
    } else {
        continueNextTurn(perRow);
    }
}

function continueNextTurn(perRow) {
    if (window.gameState.battleEnded) {
        window.gameState._rebuildInProgress = false;
        return;
    }

    window.gameState.attackers = rebuildArmyLines(window.gameState.attackers, perRow);
    window.gameState.defenders = rebuildArmyLines(window.gameState.defenders, perRow);

    if (window.addToLog) window.addToLog('👥 Армии перестраиваются...');

    // Сбрасываем флаги атаки для всех юнитов
    window.gameState.attackers.forEach(unit => unit.hasAttackedThisTurn = false);
    window.gameState.defenders.forEach(unit => unit.hasAttackedThisTurn = false);

    // Устанавливаем активную сторону согласно конфигу боя (по умолчанию защитники)
    window.gameState.activeSide = getFirstSide(window.battleConfig && window.battleConfig.battleConfig);

    window.gameState.currentTurn++;

    if (typeof window.updateBattleStats === 'function') window.updateBattleStats();

    if (window.addToLog) window.addToLog(`🔄 Начинается ход ${window.gameState.currentTurn}`);
    
    window.gameState._rebuildInProgress = false;
    
    if (window.renderArmies) window.renderArmies();
}

function checkBattleEnd() {
    const attackersAlive = window.gameState.attackers.some(unit => unit.alive);
    const defendersAlive = window.gameState.defenders.some(unit => unit.alive);

    if (!attackersAlive) {
        endBattle('defenders');
    } else if (!defendersAlive) {
        endBattle('attackers');
    }
}

function endBattle(winner) {
    window.gameState.battleEnded = true;

    const winnerName = winner === 'attackers' ? 'Атакующие' : 'Защитники';
    if (window.addToLog) {
        window.addToLog(`🏆 ${winnerName} побеждают!`);
        window.addToLog(`Бой завершен за ${window.gameState.currentTurn} ходов`);
    }

    if (window.updateButtonStates) window.updateButtonStates();
    if (typeof window.updateBattleStats === 'function') window.updateBattleStats();
}

export function resetBattle() {
    if (typeof window._stopAutoPlay === 'function') window._stopAutoPlay();
    window._autoPlaySpeed = 1;
    initializeArmies();
    if (window.renderArmies) window.renderArmies();

    safeCall(function() {
        var s = callIfExists('GameSettings', 'get', [], null) ||
            (typeof window.getCurrentSettings === 'function' ? window.getCurrentSettings() : null);
        var autoEnabled = !!(s && s.battleSettings && s.battleSettings.autoPlay);
        if (autoEnabled && typeof window.toggleAutoPlay === 'function' && !window._autoPlayActive) {
            window.toggleAutoPlay();
        }
    }, undefined, 'resetBattle:autoPlay');

    safeCall(function() {
        var spBtn = document.getElementById('auto-speed-btn');
        if (spBtn) spBtn.textContent = '⏩ x1';
        if (typeof window._rescheduleAutoPlayTick === 'function') window._rescheduleAutoPlayTick();
        if (typeof window.updateButtonStates === 'function') window.updateButtonStates();
    }, undefined, 'resetBattle:updateUI');

    // Обновляем счетчик ходов
    const turnCounter = document.getElementById('turn-counter');
    if (turnCounter) {
        turnCounter.textContent = 'Ход: 1';
    }

    // Очищаем лог
    const logDiv = document.getElementById('battle-log');
    if (logDiv) {
        logDiv.innerHTML = '';
    }

    if (window.addToLog) window.addToLog('🔄 Бой сброшен');
}


