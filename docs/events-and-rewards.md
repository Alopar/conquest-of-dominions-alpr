# События и награды

## События (events_config.json)

События используются для создания интерактивных ситуаций на карте приключения. Каждое событие может иметь несколько вариантов выбора с различными эффектами.

### Структура события

```json
{
  "id": "E-01.001",
  "tier": 1,
  "name": "Сломанный обоз",
  "description": "На дороге найден сломанный обоз. Можно забрать припасы.",
  "options": [
    {
      "id": "take",
      "text": "Забрать припасы",
      "effects": [
        { "type": "rewardById", "id": "E-01.001" }
      ]
    },
    {
      "id": "leave",
      "text": "Пройти мимо",
      "effects": []
    }
  ]
}
```

### Поля события

- **id** (string, обязательное) — уникальный идентификатор события
- **tier** (number, обязательное) — уровень события, определяет на каком тире карты может появиться событие
- **name** (string, обязательное) — название события, отображается в заголовке модального окна
- **description** (string, обязательное) — описание события, показывается игроку
- **options** (array, обязательное) — массив вариантов выбора для игрока

### Структура опции

- **id** (string, обязательное) — уникальный идентификатор опции
- **text** (string, обязательное) — текст кнопки выбора
- **effects** (array, обязательное) — массив эффектов, применяемых при выборе этой опции

### Типы эффектов

#### 1. currency — прямая выдача валюты

Выдает валюту напрямую в состояние приключения.

```json
{
  "type": "currency",
  "id": "gold",
  "amount": 100
}
```

**Параметры:**
- **id** (string) — идентификатор валюты из `currencies_config.json`
- **amount** (number) — количество валюты

**Пример:**
```json
{
  "effects": [
    { "type": "currency", "id": "gold", "amount": 50 },
    { "type": "currency", "id": "glory", "amount": 200 }
  ]
}
```

#### 2. rewardById — выдача награды по ID таблицы

Выдает награды из таблицы наград по её идентификатору. Поддерживает режимы `all` (все награды) и `select` (выбор одной награды).

```json
{
  "type": "rewardById",
  "id": "E-01.001"
}
```

**Параметры:**
- **id** (string) — идентификатор таблицы наград из `rewards_config.json`

**Пример:**
```json
{
  "effects": [
    { "type": "rewardById", "id": "E-01.001" }
  ]
}
```

#### 3. rewardByTier — выдача награды по тиру

Случайно выбирает таблицу наград указанного тира и выдает награды из неё.

```json
{
  "type": "rewardByTier",
  "tier": 3
}
```

**Параметры:**
- **tier** (number) — уровень тира для выбора таблицы наград

**Пример:**
```json
{
  "effects": [
    { "type": "rewardByTier", "tier": 2 }
  ]
}
```

### Примеры событий

#### Простое событие с валютой
```json
{
  "id": "E-SIMPLE-01",
  "tier": 1,
  "name": "Найден клад",
  "description": "Вы нашли сундук с золотом.",
  "options": [
    {
      "id": "take",
      "text": "Взять золото",
      "effects": [
        { "type": "currency", "id": "gold", "amount": 100 }
      ]
    },
    {
      "id": "leave",
      "text": "Оставить",
      "effects": []
    }
  ]
}
```

#### Событие с выбором награды
```json
{
  "id": "E-CHOICE-01",
  "tier": 2,
  "name": "Магазин торговца",
  "description": "Торговец предлагает вам выбор награды.",
  "options": [
    {
      "id": "trade",
      "text": "Обменять",
      "effects": [
        { "type": "rewardById", "id": "TRADE-02.001" }
      ]
    },
    {
      "id": "leave",
      "text": "Уйти",
      "effects": []
    }
  ]
}
```

#### Событие с несколькими эффектами
```json
{
  "id": "E-MULTI-01",
  "tier": 3,
  "name": "Победа над бандитами",
  "description": "Вы победили группу бандитов и получили награды.",
  "options": [
    {
      "id": "continue",
      "text": "Продолжить",
      "effects": [
        { "type": "currency", "id": "gold", "amount": 150 },
        { "type": "rewardByTier", "tier": 3 }
      ]
    }
  ]
}
```

## Награды (rewards_config.json)

Таблицы наград определяют наборы наград, которые могут быть выданы игроку. Награды могут выдаваться как все сразу (`mode: "all"`), так и с выбором одной из нескольких (`mode: "select"`).

### Структура таблицы наград

```json
{
  "id": "E-01.001",
  "tier": 99,
  "tags": [],
  "mode": "all",
  "rewards": [
    { "type": "currency", "id": "gold", "amount": "100-150" }
  ]
}
```

### Поля таблицы наград

- **id** (string, обязательное) — уникальный идентификатор таблицы наград
- **tier** (number, обязательное) — уровень тира таблицы (используется для `rewardByTier`)
- **tags** (array, опциональное) — массив тегов для фильтрации (в настоящее время не используется)
- **mode** (string, обязательное) — режим выдачи наград:
  - `"all"` — выдать все награды из списка
  - `"select"` — показать игроку выбор одной награды из списка
- **rewards** (array, обязательное) — массив наград

### Типы наград

#### 1. currency — валюта

Выдает валюту игроку. Количество может быть фиксированным числом или диапазоном.

```json
{
  "type": "currency",
  "id": "gold",
  "amount": 100
}
```

или с диапазоном:

```json
{
  "type": "currency",
  "id": "gold",
  "amount": "100-150"
}
```

**Параметры:**
- **type** (string) — всегда `"currency"`
- **id** (string) — идентификатор валюты из `currencies_config.json` (например, `"gold"`, `"glory"`)
- **amount** (number | string) — количество валюты:
  - число: фиксированное количество (например, `100`)
  - строка: диапазон в формате `"min-max"` (например, `"100-150"`)

**Примеры:**
```json
{ "type": "currency", "id": "gold", "amount": 50 }
{ "type": "currency", "id": "glory", "amount": "200-300" }
{ "type": "currency", "id": "gold", "amount": "10-50" }
```

#### 2. unit — юниты/союзники

Добавляет юнитов в пул армии игрока. Количество может быть фиксированным или диапазоном.

```json
{
  "type": "unit",
  "id": "archer",
  "amount": 3
}
```

или с диапазоном:

```json
{
  "type": "unit",
  "id": "archer",
  "amount": "2-5"
}
```

**Параметры:**
- **type** (string) — всегда `"unit"` (также поддерживается `"monster"`, который автоматически преобразуется в `"unit"`)
- **id** (string) — идентификатор юнита из `monsters_config.json`
- **amount** (number | string) — количество юнитов:
  - число: фиксированное количество (например, `3`)
  - строка: диапазон в формате `"min-max"` (например, `"2-5"`)

**Примеры:**
```json
{ "type": "unit", "id": "archer", "amount": 2 }
{ "type": "unit", "id": "rogue", "amount": "3-6" }
{ "type": "monster", "id": "wolf", "amount": "5-10" }
```

#### 3. perk — перки

Выдает перк герою. Количество всегда равно 1 (параметр `amount` игнорируется для перков).

```json
{
  "type": "perk",
  "id": "strong_arms",
  "amount": 1
}
```

**Параметры:**
- **type** (string) — всегда `"perk"`
- **id** (string) — идентификатор перка из `perks_config.json`
- **amount** (number | string) — игнорируется, всегда выдается один перк

**Примеры:**
```json
{ "type": "perk", "id": "strong_arms", "amount": 1 }
{ "type": "perk", "id": "quick_reflexes", "amount": 1 }
```

### Примеры таблиц наград

#### Простая таблица с валютой
```json
{
  "id": "SIMPLE-GOLD",
  "tier": 1,
  "tags": [],
  "mode": "all",
  "rewards": [
    { "type": "currency", "id": "gold", "amount": "50-100" }
  ]
}
```

#### Таблица с несколькими валютами
```json
{
  "id": "MULTI-CURRENCY",
  "tier": 2,
  "tags": [],
  "mode": "all",
  "rewards": [
    { "type": "currency", "id": "gold", "amount": "100-200" },
    { "type": "currency", "id": "glory", "amount": "150-250" }
  ]
}
```

#### Таблица с юнитами
```json
{
  "id": "UNITS-REWARD",
  "tier": 3,
  "tags": [],
  "mode": "all",
  "rewards": [
    { "type": "unit", "id": "archer", "amount": "2-4" },
    { "type": "unit", "id": "rogue", "amount": "3-5" }
  ]
}
```

#### Таблица с перком
```json
{
  "id": "PERK-REWARD",
  "tier": 4,
  "tags": [],
  "mode": "all",
  "rewards": [
    { "type": "perk", "id": "strong_arms", "amount": 1 }
  ]
}
```

#### Таблица с выбором награды (mode: "select")
```json
{
  "id": "CHOICE-REWARD",
  "tier": 5,
  "tags": [],
  "mode": "select",
  "rewards": [
    { "type": "currency", "id": "gold", "amount": 500 },
    { "type": "unit", "id": "archer", "amount": 5 },
    { "type": "perk", "id": "quick_reflexes", "amount": 1 }
  ]
}
```

#### Комплексная таблица
```json
{
  "id": "COMPLEX-REWARD",
  "tier": 6,
  "tags": [],
  "mode": "all",
  "rewards": [
    { "type": "currency", "id": "gold", "amount": "200-300" },
    { "type": "currency", "id": "glory", "amount": "300-400" },
    { "type": "unit", "id": "mage", "amount": "1-2" },
    { "type": "unit", "id": "archer", "amount": "3-5" }
  ]
}
```

## Энкаунтеры (encounters_config.json)

Энкаунтеры могут иметь награды двумя способами:

### 1. Через rewardId

Ссылка на таблицу наград из `rewards_config.json`:

```json
{
  "id": "01.001",
  "tier": 1,
  "class": "normal",
  "tags": ["village"],
  "weight": 1,
  "monsters": [
    { "id": "rat", "amount": "4-6" }
  ],
  "rewardId": "B-01.001"
}
```

### 2. Inline награды

Прямое указание наград в конфигурации энкаунтера:

```json
{
  "id": "01.002",
  "tier": 1,
  "class": "normal",
  "tags": ["village"],
  "weight": 1,
  "monsters": [
    { "id": "rogue", "amount": "2-3" }
  ],
  "rewards": [
    { "type": "currency", "id": "gold", "amount": 50 },
    { "type": "monster", "id": "archer", "amount": 2 }
  ]
}
```

**Примечание:** В inline наградах энкаунтеров поддерживаются только типы `currency` и `monster` (который преобразуется в `unit`).

## Модификаторы наград

Валютные награды могут быть модифицированы через систему модификаторов (`Modifiers.getRewardMultiplier`). Множитель применяется только к валютам типа `currency`.

## Валидация

Все конфигурации проверяются при загрузке:

- **events_config.json** — проверяется структура событий и опций
- **rewards_config.json** — проверяется структура таблиц и типы наград
- **encounters_config.json** — проверяется структура энкаунтеров и их награды

Некорректные конфигурации вызывают ошибки при загрузке игры.

