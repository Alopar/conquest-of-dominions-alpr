# Фаза 3: Продолжение разделения модулей

## Цель

Завершить разделение крупных файлов на логические модули.

## Текущий статус adventure.js

После первой итерации:
- ✅ `adventure/state.js` - состояние
- ✅ `adventure/ui.js` - базовый UI
- ✅ `adventure/navigation.js` - навигация
- ✅ `adventure/encounters.js` - встречи
- ✅ `adventure/battle.js` - бой
- ✅ `adventure/raids.js` - рейды

## Осталось вынести

### 3.1 adventure/subscreens.js
- [x] `ensureAdventureTabs()` - создание вкладок
- [x] `updateTabsActive()` - активация вкладок
- [x] `loadAdventureSubscreen()` - загрузка подэкрана
- [x] `renderAdventureSubscreen()` - рендер подэкрана
- [x] `renderHeroDevelopment()` - развитие героя (~160 строк)
- [x] `showUpgradeInfoModal()` - модалка улучшения

### 3.2 adventure/setup.js
- [ ] `showAdventureSetup()` - показ экрана настройки
- [ ] `loadAdventureFile()` - загрузка файла
- [ ] `loadDefaultAdventure()` - загрузка дефолтного
- [ ] `renderHeroClassSelectionSetup()` - выбор класса (~100 строк)
- [ ] `onHeroClassClick()` - клик по классу (~80 строк)

### 3.3 adventure/map-render.js
- [x] `renderMapBoard()` - рендер карты (~130 строк)
- [x] `renderThreatLevelIndicator()` - индикатор угрозы (~200 строк)
- [x] `showThreatDetailsModal()` - модалка угрозы (~340 строк)
- [x] `showContentItemModal()` - модалка контента (~270 строк)

## Задачи для ui.js

### 3.4 ui/modals.js
- [x] Логика модальных окон
- [x] `showModal()`, `closeModal()`

### 3.5 ui/tooltips.js
- [x] `attachTooltip()`, `clearTooltips()`

### 3.6 ui/toasts.js
- [x] `showToast()` уведомления

## Задачи для game.js

### 3.7 game/state.js
- [x] Состояние игры (армии, конфиг)

### 3.8 game/logic.js
- [x] Логика боя, инициализация

### 3.9 game/renderer.js
- [x] `renderArmies()`, `renderUnit()`

## Порядок выполнения

1. **adventure/subscreens.js** - самый большой блок
2. **adventure/setup.js** - изолированная логика
3. **adventure/map-render.js** - тяжёлый рендеринг
4. **ui/* модули** - после стабилизации adventure
5. **game/* модули** - финальная фаза

## Метрики успеха

| Файл | До (строк) | После (строк) |
|------|------------|---------------|
| adventure.js | ~2100 | ~300 |
| ui.js | ~600 | ~200 |
| game.js | ~800 | ~300 |

## Как продолжить

```bash
# В Cursor:
1. Откройте adventure.js
2. Выделите функции для subscreens.js
3. Создайте файл и перенесите код
4. Добавьте script в index.html
5. Протестируйте
```

