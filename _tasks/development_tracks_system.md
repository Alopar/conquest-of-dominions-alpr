### Фича: Система развития героя на шкалах (переключаемая из настроек)

#### Цель
- Ввести альтернативную систему развития героя в виде шкал (треков) с вложением очков в деления.
- Сохранить текущую систему «магазина улучшений» и позволить переключение между системами через настройки.
- Эффекты геймплея остаются через перки: треки также выдают перки при достижении порогов.

#### Ограничения/конвенции
- Разметка UI — в шаблонах `fragments/templates.html`; JS управляет данными и обработчиками.
- Заголовки модалок по центру.
- Без новых тяжёлых зависимостей.

---

### Требования к системе треков
- Разные треки с уникальными `id`, пригодные к переиспользованию разными героями.
- Для каждого трека определять валюту (`currencyId`), цену деления (`unitCost`) и пороги с перками: каждая запись — `value` (кол-во делений) и `grantsPerks`.
- Возможность указывать, какие треки доступны конкретному герою (на уровне класса героя).
- Переключение режима развития через настройки: `development.mode: "shop" | "tracks"`.
- В UI экрана развития: новая кнопка с иконкой `📊` для входа в режим шкал; при переключении режимов показывать только одну релевантную кнопку.

---

### Конфиги (новые и изменения)
1) Новый конфиг треков: `assets/configs/development_tracks.json`

```json
{
  "tracks": [
    {
      "id": "offense",
      "icon": "⚔️",
      "name": "Атака",
      "currencyId": "glory",
      "unitCost": 1,
      "thresholds": [
        { "value": 5,  "grantsPerks": ["dmg_melee_plus_1"] },
        { "value": 10, "grantsPerks": ["dmg_range_plus_1"] }
      ]
    },
    {
      "id": "defense",
      "icon": "🛡️",
      "name": "Защита",
      "currencyId": "glory",
      "unitCost": 1,
      "thresholds": [
        { "value": 5,  "grantsPerks": ["hp_melee_plus_5"] },
        { "value": 10, "grantsPerks": ["hp_range_plus_3"] }
      ]
    }
  ]
}
```

2) Привязка треков к героям: добавить в `assets/configs/hero_classes.json` (для каждого класса) поле `developmentTracks: string[]` с перечнем `id` доступных треков.

3) Настройки игры: `assets/configs/game_settings.json`

```json
{
  "gameSettings": {
    "development": { "mode": "shop" }
  }
}
```

4) Регистрация конфига в статических данных: `js/state/staticData.js` — добавить дескриптор `{ id: 'developmentTracks', assets: ['assets/configs/development_tracks.json'], validatorName: 'validateDevelopmentTracksConfig' }`.

5) Валидатор: `js/io/validators.js` — `validateDevelopmentTracksConfig(cfg)`:
- `tracks` — массив.
- Уникальные `id`.
- `currencyId` существует в `currencies_config.json`.
- `unitCost` — положительное число.
- `thresholds` — массив с возрастающими `value` и массивом строк `grantsPerks`, перки существуют в `perks_config.json`.

---

### Состояние и модуль логики
Новый модуль: `js/state/tracks.js`

Основные обязанности:
- Инициализация для выбранного класса героя: учитывать доступные треки (`developmentTracks` из класса).
- Чтение конфига треков из StaticData; предоставление удобных карт по `id`.
- Проверка возможности вложения: хватает ли валюты в `adventureState.currencies[currencyId]` с учётом `unitCost` и количества делений.
- Вложение в трек: списать валюту, увеличить прогресс по треку, выдать перки при пересечении порогов через `Perks.addMany`, пересчитать `Modifiers`.
- Персист: хранить прогресс по классам (ключ вида `tracksState:{classId}`) в `localStorage`.

Публичные методы (минимум):
- `initForClass(classId)`
- `getAvailableTracks()` → массив треков для текущего класса
- `getProgress(trackId)` → число делений
- `canInvest(trackId, units)` → { ok, requiredPrice }
- `invest(trackId, units)` → bool

---

### UI и шаблоны
Новые шаблоны в `fragments/templates.html`:
- `tpl-dev-tracks-screen` — контейнер экрана треков
- `tpl-dev-track-row` — строка трека (иконка, название, прогресс, кнопки вложения)
- `tpl-dev-track-item` — визуализация делений/порогов

Кнопка навигации на экран треков:
- Добавить кнопку с иконкой `📊` на экран развития героя.
- При `development.mode === 'tracks'` показывать кнопку `📊` и скрывать кнопку магазина; при `shop` — наоборот.

Рендер:
- В `js/adventure.js` внутри `renderHeroDevelopment()` читать `GameSettings.get().development?.mode` и ветвить: `renderShop()` | `renderTracks()`.
- `renderTracks()` рендерит треки, прогресс и предоставляет кнопки вложения (например, +1 деление, +5 делений), подтверждение списания валюты.

---

### Интеграция
- Инициализация модулей при выборе класса героя: из `Hero.setClassId` вызвать `Tracks.initForClass(classId)`.
- StaticData: зарегистрировать `developmentTracks`.
- Validators: добавить и подключить `validateDevelopmentTracksConfig`.
- Настройки: добавить UI‑переключатель в `fragments/settings.html` и обработку в `js/settings.js`.
- Эффекты баланса остаются через `Perks`/`Modifiers` — изменений не требуется.

---

### Этапы внедрения (MVP → расширения)
1) Конфиги и валидаторы
- Добавить `development_tracks.json`, зарегистрировать в `staticData`, реализовать валидатор.
- Расширить `hero_classes.json` полем `developmentTracks`.

2) Модуль состояния/логики
- Создать `js/state/tracks.js` с API init/canInvest/invest/getProgress.
- Персист прогресса по `classId`.

3) UI и переключение
- Шаблоны `tpl-dev-tracks-*` и кнопка `📊`.
- Ветвление `renderHeroDevelopment()` по `development.mode`.
- Скрывать неактуальную кнопку (магазин/шкалы) в зависимости от режима.

4) Настройки
- В `game_settings.json` добавить `development.mode` (по умолчанию `shop`).
- Экран настроек: радиокнопки/селект, сохранение в `GameSettings`.

5) Тест‑план
- Смена режима в настройках мгновенно меняет UI развития.
- Вложение очков списывает нужную валюту, прогресс растёт, пороги выдают перки, модификаторы пересчитываются.
- Персист: после перезагрузки прогресс и режим сохраняются.
- Героев с разными наборами треков не путаем между собой.

6) Расширения (после MVP)
- Альтернативные валюты на разных треках, отображение из `currencies_config.json`.
- Массовое вложение (вплоть до следующего порога) и предпросмотр выдаваемых перков.
- История вложений/tooltip порогов.

---

### Изменяемые/добавляемые файлы
- `assets/configs/development_tracks.json` (новый)
- `assets/configs/hero_classes.json` (расширение: `developmentTracks`)
- `assets/configs/game_settings.json` (расширение: `development.mode`)
- `js/state/staticData.js` (регистрация `developmentTracks`)
- `js/io/validators.js` (новый валидатор `validateDevelopmentTracksConfig`)
- `js/state/tracks.js` (новый)
- `js/adventure.js` (ветвление рендера развития и вызовы `Tracks`)
- `fragments/templates.html` (новые шаблоны `tpl-dev-tracks-*`, кнопка `📊`)
- `css/screens.css` (стили треков)

---

### Критерии готовности MVP
- Переключение `shop`/`tracks` работает из настроек; на экране развития показывается соответствующая кнопка.
- Треки читаются из конфига, валидируются; у каждого героя — свой набор треков.
- Инвестирование списывает правильную валюту, увеличивает прогресс и выдаёт перки на порогах.
- Состояние прогресса сохраняется и корректно восстанавливается.

---

### Чеклист выполнения
- [x] Подготовить план и чеклист в `_tasks`
- [ ] Зарегистрировать конфиг `development_tracks` в `staticData`
- [ ] Реализовать `validateDevelopmentTracksConfig`
- [ ] Добавить `developmentTracks` в `hero_classes.json`
- [ ] Создать `js/state/tracks.js` с API и персистом
- [ ] Добавить шаблоны `tpl-dev-tracks-*` и стили
- [ ] Добавить кнопку `📊` и ветвление `renderHeroDevelopment()`
- [ ] Обновить `game_settings.json` и экран настроек
- [ ] Провести MVP‑тесты и полировку

---

### Опорные промпты (для пошаговой работы в Cursor)
```text
Добавь в js/state/staticData.js регистрацию developmentTracks и заглушку валидатора.
Создай assets/configs/development_tracks.json с двумя треками offense/defense (как в примере).
Реализуй validateDevelopmentTracksConfig с проверками id/currencyId/unitCost/thresholds.
Расширь hero_classes.json полем developmentTracks для каждого класса (выбери offense/defense).
Создай js/state/tracks.js с initForClass/getAvailableTracks/getProgress/canInvest/invest и персистом.
Добавь в fragments/templates.html шаблоны tpl-dev-tracks-screen/tpl-dev-track-row/tpl-dev-track-item и кнопку 📊.
Во внедрении в js/adventure.js: внутри renderHeroDevelopment() добавь ветвление по GameSettings.get().development.mode.
Расширь assets/configs/game_settings.json и экран настроек (флажок или радиокнопки shop/tracks).
Проверь списание валюты и выдачу перков на порогах; пересчёт Modifiers.
```


