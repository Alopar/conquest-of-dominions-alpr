# Фаза 4: ES Modules для UI и Экранов

## Цель

Устранить зависимость от глобального объекта `window` и порядка загрузки скриптов в `index.html`. Перевести все UI-компоненты и экраны на стандартные ES Modules (`import`/`export`).

## Текущее состояние

- ✅ Ядро (`js/core/`) переведено.
- ✅ Состояние (`js/state/`) переведено.
- ✅ Основной файл `adventure.js` разделен, но все части всё ещё "грязные" (используют `window`).
- ❌ UI библиотека (`js/ui/`) — глобальные скрипты.
- ❌ Экраны (`js/screens/`) — глобальные скрипты.

## План миграции

### 4.1 Миграция UI-библиотеки
- [ ] `js/ui/components.js` -> export `UI`
- [ ] `js/ui/modals.js` -> export `Modals`
- [ ] `js/ui/toasts.js` -> export `Toasts`
- [ ] `js/ui/tooltips.js` -> export `Tooltips`
- [ ] `js/ui/animations.js` -> export `Animations`
- [ ] Обновить `js/ui/ui.js` как точку входа UI.

### 4.2 Миграция подсистем Adventure
- [ ] `adventure/state.js` -> export `adventureState`
- [ ] `adventure/ui.js`
- [ ] `adventure/navigation.js`
- [ ] `adventure/encounters.js`
- [ ] `adventure/battle.js`
- [ ] `adventure/raids.js`
- [ ] `adventure/setup.js`
- [ ] `adventure/subscreens.js`
- [ ] `adventure/mapRenderer.js`

### 4.3 Миграция остальных экранов
- [ ] `js/screens/bestiary.js`
- [ ] `js/screens/settings.js`
- [ ] `js/screens/configScreen.js`
- [ ] `js/screens/adventure.js` (сборка всех зависимостей)

### 4.4 Финализация
- [ ] Обновить `js/app.js` для импорта экранов.
- [ ] Очистить `index.html` от всех `<script>` тегов кроме `app.js`.

## Порядок действий

1. Начать с `js/ui/`, так как от него зависят все экраны.
2. Перевести мелкие экраны (`settings`, `bestiary`).
3. Перевести `adventure` (самый сложный блок).
4. Протестировать сборку.

