### Фича: Многосекторное приключение и отдельные схемы путей

#### Цель
- Сделать приключение последовательностью секторных карт. Каждый сектор — самостоятельный граф пути.
- Схемы генерации путей вынести в отдельный конфиг и выбирать по номеру сектора.
- Без обратной совместимости: старый `mapGen` в `adventure_config.json` не допускается.
- Переход между секторами — после зачистки текущего, с подтверждающей модалкой.

---

### Архитектурные решения
- Разделение конфигов:
  - `assets/configs/adventure/adventure_config.json`: метаданные приключения и список `sectors[]` c полем `number`.
  - `assets/configs/adventure/path_schemes.json`: массив `schemes[]` с привязкой `sector:number` и параметрами генерации (`mapGen`, `tierByDepth`, `mixByDepth`).
- Выбор схемы по текущему сектору: `sectorNumber = adventure.config.sectors[currentStageIndex].number` → поиск схемы.
- Генерация карты сектора: единообразно через `AdventureGraph.generateAdventureMap({ mapGen })`, куда в `mapGen` встраиваются `tierByDepth` и `mixByDepth` из схемы.
- Состояние хранит только текущий сектор: `map`, `currentNodeId`, `resolvedNodeIds`, `currentStageIndex`, `sectorSeeds[]`, `sectorCount`.
- UI отображает текущий сектор и индикатор `Сектор X/Y`. Переход к следующему сектору — через модалку подтверждения.

---

### Конфиги
1) Новый файл `assets/configs/adventure/path_schemes.json`
```json
{
  "schemes": [
    {
      "sector": 1,
      "mapGen": { "depth": 4, "widthRange": [1, 3], "edgeDensity": 0.55, "guaranteePath": true, "seeded": true },
      "tierByDepth": [1, 1, 1, 1],
      "mixByDepth": [
        { "battle": 0.7, "event": 0.3 },
        { "battle": 0.6, "event": 0.4 },
        { "battle": 0.7, "elite": 0.3 },
        { "battle": 0.5, "event": 0.5 }
      ]
    }
  ]
}
```

2) Обновление `assets/configs/adventure/adventure_config.json`
```json
{
  "adventure": {
    "name": "Путь героя",
    "description": "...",
    "startingCurrencies": [ { "id": "gold", "amount": 0 } ]
  },
  "sectors": [
    { "number": 1, "name": "I" },
    { "number": 2, "name": "II" }
  ]
}
```
- Удалить корневой `mapGen` (теперь он хранится только в `path_schemes.json`).

3) Регистрация нового конфига
- `js/state/staticData.js`: добавить дескриптор `{ id: 'pathSchemes', title: 'Схемы путей', assets: ['assets/configs/adventure/path_schemes.json'], validatorName: 'validatePathSchemesConfig' }`.

4) Валидаторы
- `js/io/validators.js`:
  - Заменить `validateAdventureConfig` на строгую версию: требовать `sectors[]` (непустой), у каждого `number:number>=1`; запретить `mapGen`.
  - Новый `validatePathSchemesConfig`: требовать `schemes[]` (непустой), уникальные `sector`, корректный `mapGen` и массивы `tierByDepth`/`mixByDepth`.

---

### Логика генерации и состояния
- Хелперы в `js/screens/adventure.js`:
  - `getSectorCount(): number`
  - `getSectorNumberByIndex(index: number): number`
  - `getPathSchemeForSector(sectorNumber: number): Scheme | null`
  - `ensureSectorSeeds(count: number): void`
  - `generateSectorMap(index: number): void` — берёт схему, собирает `cfg = { mapGen: { ...scheme.mapGen, tierByDepth: scheme.tierByDepth, mixByDepth: scheme.mixByDepth } }`, вызывает `AdventureGraph.generateAdventureMap(cfg, seed)` и инициализирует `map/currentNodeId/resolvedNodeIds`.
  - `isCurrentSectorCleared(): boolean` — проверяет посещение всех `boss` узлов.
  - `advanceToNextSectorWithModal(): Promise<boolean>` — модалка подтверждения, переключение `currentStageIndex`, генерация следующего сектора, показ экрана приключения.

- Точки интеграции:
  - В `beginAdventureFromSetup()`: `currentStageIndex=0`, `sectorCount=getSectorCount()`, `ensureSectorSeeds()`, `generateSectorMap(0)`.
  - В `renderMapBoard()`: при отсутствии `map` — `generateSectorMap(currentStageIndex||0)`.
  - В `renderAdventure()`: индикатор сектора рядом с названием приключения.

---

### Переходы между секторами
- В `js/ui/ui.js` внутри `finishBattleToAdventure()` после применения наград:
  - Вычислить `sectorCleared = isCurrentSectorCleared()`.
  - Если сектор пройден: `await advanceToNextSectorWithModal()`;
    - если следующего сектора нет — показать финальную победу `showAdventureResult('✨🏆✨ Победа! Все испытания пройдены! ✨🏆✨')`;
    - если есть — вернуться на экран приключения.
  - Если сектор не пройден — просто вернуться на экран приключения.

Примечание: заголовок модалки — по правилам UI (по центру, единый стиль заголовков).

---

### Валидаторы: требования
- `validateAdventureConfig`:
  - `adventure` — объект, `startingCurrencies` — массив
  - `sectors` — непустой массив объектов
  - каждый сектор: `number:number>=1`, `name?:string`
  - запретить наличие `mapGen`

- `validatePathSchemesConfig`:
  - `schemes` — непустой массив
  - уникальные `sector:number>=1`
  - `mapGen` — объект: `depth:number>=1`, `widthRange:[number,number]`, `edgeDensity:(0,1]`, `guaranteePath:boolean`, `seeded:boolean`
  - `tierByDepth:number[]`, `mixByDepth:object[]`

---

### UI/UX
- Индикатор текущего сектора: «Сектор X/Y» справа от названия приключения в топбаре.
- Подтверждающая модалка при переходе между секторами.
- Отдельной «карты секторов» нет — показываем только текущий граф сектора.

---

### Тест‑план
1) Конфиги загружаются: `adventure` и `pathSchemes`; валидации проходят.
2) При старте генерируется сектор 1; показан индикатор «Сектор 1/Y».
3) После зачистки босса открывается модалка; подтверждение переключает на следующий сектор, индикатор меняется.
4) После последнего сектора — экран победы.
5) Перезапуск страницы сохраняет прогресс сектора и корректно восстанавливает карту.
6) Награды/события/бои работают в любом секторе.

---

### Изменяемые/добавляемые файлы
- `assets/configs/adventure/adventure_config.json` (пересборка структуры, добавлен `sectors[]`)
- `assets/configs/adventure/path_schemes.json` (новый)
- `js/state/staticData.js` (регистрация `pathSchemes`)
- `js/io/validators.js` (новый `validatePathSchemesConfig`, обновлённый `validateAdventureConfig`)
- `js/screens/adventure.js` (хелперы и интеграции сектора)
- `js/ui/ui.js` (переход сектора/финал)
- `docs/configs.md` (описание новых конфигов)

---

### Чек‑лист выполнения
- [ ] Создать `assets/configs/adventure/path_schemes.json` с примерной схемой сектора 1
- [ ] Пересобрать `assets/configs/adventure/adventure_config.json`: удалить `mapGen`, добавить `sectors[]` с `number`
- [ ] Зарегистрировать `pathSchemes` в `js/state/staticData.js`
- [ ] Реализовать `validatePathSchemesConfig` в `js/io/validators.js`
- [ ] Заменить `validateAdventureConfig` на строгую версию (требовать `sectors`, запрещать `mapGen`)
- [ ] Добавить в `js/screens/adventure.js`: getSectorCount/getSectorNumberByIndex/getPathSchemeForSector/ensureSectorSeeds/generateSectorMap/isCurrentSectorCleared/advanceToNextSectorWithModal
- [ ] Обновить `beginAdventureFromSetup()` и `renderMapBoard()` для генерации текущего сектора
- [ ] Добавить индикатор сектора в `renderAdventure()`
- [ ] Обновить `js/ui/ui.js` (`finishBattleToAdventure`): переход сектора через модалку или финальная победа
- [ ] Обновить `docs/configs.md` и при необходимости `docs/screens.md`
- [ ] Пройти тест‑план и устранить найденные проблемы

---

### Опорные промпты
```text
Добавь регистрацию конфига pathSchemes в js/state/staticData.js и заглушку валидатора.
Создай assets/configs/adventure/path_schemes.json по образцу и проверь валидацию.
Обнови validateAdventureConfig: требуй sectors[], запрети mapGen.
В js/screens/adventure.js добавь функции генерации сектора и индикатор сектора.
В js/ui/ui.js замени проверки конца карты на логику sectorCleared → advanceToNextSectorWithModal/финал.
```


