## Состояние и данные

### Бой
- window.gameState: attackers[], defenders[], currentTurn, activeSide, battleEnded, battleLog

### Статические данные
- StaticData: загрузка конфигов по id (см. `docs/configs.md`)

### Настройки
- GameSettings: base (assets/configs/game/game_settings.json) + user (LS key: `gameSettings`)

### Герой/перки/треки
- Hero (LS: `heroState`), Achievements (LS: `achievementsProgress`), Tracks/Development/Perks — внутриигровые состояния
