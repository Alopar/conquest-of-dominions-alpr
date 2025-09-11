### Фича: Карта-путь приключения с выбором маршрута, маркером игрока и анимацией

#### Цель
- Заменить текущую линейную «Карту приключения» на граф маршрута с ветвлениями и общим движением к боссу. 
- Минимальный набор узлов: fight, elite, boss, event, reward. Магазин/отдых — позже.
- Подогрев ожидания: анимация движения маркера игрока по ребру с временной блокировкой ввода поверх всего.

#### Ограничения/конвенции
- Разметка UI — в шаблонах `fragments/templates.html`; JS создаёт только данные и связывает обработчики.
- Заголовки модалок по центру.
- Никаких новых тяжёлых зависимостей; максимум — небольшой детерминированный PRNG при необходимости (своим кодом).

---

### Этапы внедрения (MVP → расширения)

1) Данные и конфиги (MVP)
- Расширить `assets/configs/encounters_config.json` полями: `tier:number`, `tags:string[]`, `class:"normal"|"elite"|"boss"`, `weight:number`, `rewardsTableId?:string`.
- Добавить минимальные файлы: `assets/configs/events_config.json`, `assets/configs/rewards_config.json`.
- Расширить `assets/configs/adventure_config.json`: блок `mapGen` с `depth`, `widthRange`, `edgeDensity`, `tierByDepth`, `mixByDepth`, `seeded`.

2) Генератор графа (новый модуль)
- Файл `js/adventureGraph.js` с функциями:
  - `generateAdventureMap(cfg, seed)` → `{ nodes:{}, edges:[] }` с координатами `x,y` для сетки.
  - `getNeighbors(nodeId)`, `isNodeAvailable(state, id)`.
  - `pickEncounterFor({class,tier,tags})` — выбор из `encounters` по фильтрам/весу.
  - `resolveNode(nodeId)` — маршрутизация типа узла.

3) Интеграция состояния
- Расширить `adventureState`: `map`, `currentNodeId`, `movingToNodeId?`, `resolvedNodeIds`, `seed`, `inBattle`, `pendingEncounter?`.
- При `beginAdventureFromSetup`: генерировать карту, установить стартовый узел, сохранить состояние.

4) Рендер графа
- Обновить рендер раздела карты в `adventure.js`: `renderGraph()` → отрисовка узлов и `svg`‑рёбер внутри `#adventure-map-board`.
- Шаблоны в `fragments/templates.html`: `tpl-adv-node`, `tpl-adv-player-dot` (маркер), при необходимости `tpl-adv-edge`.
- Стили в `css/screens.css`: состояния узлов (available/visited/locked), маркер, блокирующий слой.

5) Маркер, анимация и блокировка ввода
- Добавить `#adventure-input-blocker` поверх `#adventure-screen` (по умолчанию `pointer-events:none, opacity:0`).
- Функции: `setInputBlock(on)`, `movePlayerMarker(from,to,durationMs=700)` на `requestAnimationFrame`.
- Клик по доступному узлу: включить блокировку, анимировать перемещение, выключить блокировку, затем `resolveNode`.

6) Узлы и действия (MVP)
- `fight/elite/boss`: выбрать энкаунтер (фильтр по `class`/`tier`/`tags`) и запустить текущий бой (уже есть `startEncounterBattle`).
- `event`: простая модалка с описанием/выбором → эффекты (валюты/перки/юниты).
- `reward`: моментальная выдача из `rewards_config`.
- Пометка узла `resolved`, переход права хода на следующую глубину.

7) Сохранение и устойчивость
- Сохранять `movingToNodeId` на время анимации, чтобы при перезагрузке корректно довести маркер и запустить действие.
- Защита от двойных кликов: флаг `_advMoving` + блокирующий слой.

8) Тест‑план
- Smoke: генерится карта, доступны 2–3 варианта на каждом шаге, финальный `boss` присутствует.
- Перезапуск страницы во время движения — корректное восстановление.
- Бои всех классов запускаются и завершаются; награды/события применяются без ошибок.
- Валидация доступности узлов (только соседи текущего).

9) Расширения (после MVP)
- Биомы/теги маршрута, zoom/pan карты, магазины/отдых.
- Продвинутая логика событий, баланс наград/весов.

---

### Опорные промпты (для пошаговой работы в Cursor)

1) Данные/конфиги
```text
Добавь поля tier/tags/class/weight/rewardsTableId в assets/configs/encounters_config.json. 
Создай minimal assets/configs/events_config.json и assets/configs/rewards_config.json. 
Расширь assets/configs/adventure_config.json блоком mapGen (depth, widthRange, edgeDensity, seeded, tierByDepth, mixByDepth).
```

2) Генератор графа
```text
Создай js/adventureGraph.js с функцией generateAdventureMap(cfg, seed). 
Сгенерируй N столбцов глубины, ширину от widthRange, рёбра к следующей глубине с edgeDensity. 
Гарантируй путь от старта до босса. Расставь типы по mixByDepth и tier по tierByDepth. 
Верни nodes с координатами x,y и edges [{from,to}].
```

3) Связка со state
```text
Расширь adventureState полями map/currentNodeId/movingToNodeId/resolvedNodeIds/seed. 
В beginAdventureFromSetup вызови generateAdventureMap и установи стартовый узел. 
Сохраняй состояние через persistAdventure.
```

4) Рендер графа
```text
Добавь renderGraph() в adventure.js: отрисуй svg‑рёбра и узлы из state.map. 
Узел: иконка по типу (fight/elite/boss/event/reward), tooltip, классы состояний. 
Клик по доступному узлу вызывает onNodeClick.
```

5) Маркер и блокировка
```text
Добавь tpl-adv-player-dot и слой #adventure-input-blocker. 
Реализуй movePlayerMarker(from,to,700ms) через requestAnimationFrame и setInputBlock(true/false). 
При клике: блокировка → анимация → разблокировка → resolveNode.
```

6) Узлы действий
```text
Реализуй resolveNode: 
- fight/elite/boss → pickEncounterFor → startEncounterBattle(encData). 
- event → модалка с 1–2 вариантами, применить эффект, отметить resolved. 
- reward → выдать награду из rewards_config, отметить resolved. 
Перерисуй граф и статус доступности.
```

7) Устойчивость
```text
Сохраняй movingToNodeId на время анимации и корректно заканчивай перемещение после reload. 
Защити от повторного запуска (флаг _advMoving + слой).
```

8) Тесты/полировка
```text
Пройдись по сценарию от старта до босса; проверь перезапуск, награды, блокировку ввода, доступность узлов.
```

---

### Изменяемые/добавляемые файлы
- `assets/configs/encounters_config.json` (расширение)
- `assets/configs/adventure_config.json` (расширение)
- `assets/configs/events_config.json` (новый)
- `assets/configs/rewards_config.json` (новый)
- `js/adventureGraph.js` (новый)
- `js/adventure.js` (дополнения: state, рендер графа, обработчики)
- `fragments/templates.html` (новые шаблоны узла/маркера)
- `css/screens.css` (стили графа, маркера, блокирующего слоя)

---

### Критерии готовности MVP
- Генерируется маршрут с ветвлениями и гарантированным босс‑узлом.
- Доступны только соседние узлы; есть маркер игрока, анимация перемещения, блокировка ввода на время анимации.
- Узлы fight/elite/boss запускают соответствующие бои; event и reward отрабатывают и изменяют состояние.
- Состояние корректно сохраняется/восстанавливается; нет двойных кликов/гонок.

---

### Чеклист выполнения
- [x] Обновить `encounters_config.json` (tier/tags/class/weight/rewardsTableId)
- [x] Добавить `events_config.json` и `rewards_config.json` (минимум контента)
- [x] Расширить `adventure_config.json` блоком `mapGen`
- [x] Реализовать `js/adventureGraph.js` (generate/getNeighbors/isNodeAvailable/pickEncounterFor/resolveNode)
- [ ] Расширить `adventureState` и инициализацию при старте
- [x] Реализовать `renderGraph()` и обработчики кликов
- [x] Добавить маркер игрока и слой блокировки ввода
- [x] Реализовать анимацию перемещения маркера
- [x] Реализовать действия узлов fight/elite/boss/event/reward
- [x] Устойчивость к перезапуску во время движения
- [x] Смоук‑тест от старта до босса, базовая полировка


