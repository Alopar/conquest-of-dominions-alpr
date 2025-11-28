(function(){
    // Игровое состояние
    let gameState = {
        attackers: [],
        defenders: [],
        currentTurn: 1,
        battleLog: [],
        battleEnded: false,
        activeSide: 'defenders', // активная сторона (по умолчанию защитники)
        _rebuildInProgress: false
    };

    // Делаем gameState доступным глобально
    window.gameState = gameState;
    if (window.setGameState) window.setGameState(gameState);

    // Функция для сброса состояния (если нужно)
    window.resetGameState = function() {
        window.gameState.attackers = [];
        window.gameState.defenders = [];
        window.gameState.currentTurn = 1;
        window.gameState.battleLog = [];
        window.gameState.battleEnded = false;
        window.gameState.activeSide = 'defenders';
        window.gameState._rebuildInProgress = false;
    };
})();

