## Карта событий (eventBus)

Источник: `js/core/eventBus.js`, публикации — `js/game.js`, `js/ui/ui.js`.

### Бой
- combat:hit — { attacker, target, damage, crit, role, army }
- combat:miss — { attacker, target, role, army }

Подписчики добавляются через `eventBus.on(name, handler)`.
