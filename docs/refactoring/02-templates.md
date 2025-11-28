# Фаза 2: Шаблоны и CSS

## Цель

Заменить программное создание DOM и inline-стили на HTML-шаблоны и CSS-классы.

## Текущая статистика

| Метрика | Количество | Основной файл |
|---------|------------|---------------|
| `document.createElement()` | ~218 | adventure.js (~168) |
| `.innerHTML =` | ~50 | adventure.js (~27) |
| inline-стили `.style.* =` | ~443 | adventure.js (~354) |
| Шаблонов в templates.html | 30 | - |

## Задачи

### 2.1 Атомарные шаблоны
- [x] `tpl-divider` - разделитель секций (реализован как `tpl-modal-divider`)
- [x] `tpl-icon-badge` - иконка с подписью (реализован как `tpl-icon-row`)
- [x] `tpl-stat-row` - строка характеристики (используется в таблицах)
- [x] `tpl-section-title` - заголовок секции
- [x] `tpl-modal-section` - текстовая секция

### 2.2 Составные шаблоны
- [x] `tpl-encounter-modal-body` - тело модалки встречи (динамическое, используются атомарные)
- [x] `tpl-adventure-tabs` - вкладки приключения (~40 строк)
- [x] `tpl-currency-badge` - бейдж валюты (~15 строк)
- [x] `tpl-threat-indicator` - индикатор угрозы (~15 строк)
- [x] `tpl-unit-modal-body` - модалка информации о юните
- [x] `tpl-icon-block-centered` - крупная иконка с заголовком

### 2.3 Утилита renderTemplate()

Добавить в `js/ui/uiToolkit.js`:

> **Статус:** Выполнено, перемещено в `js/ui/components.js`


```javascript
/**
 * @param {string} id - ID шаблона
 * @param {Object} slots - значения для data-slot
 * @param {Object} handlers - обработчики для data-action
 * @returns {HTMLElement}
 */
function renderTemplate(id, slots, handlers) {
    var tpl = document.getElementById(id);
    if (!tpl) {
        console.warn('[UI] Template not found:', id);
        return document.createElement('div');
    }
    var el = tpl.content.firstElementChild.cloneNode(true);
    if (slots) {
        Object.keys(slots).forEach(function(name) {
            el.querySelectorAll('[data-slot="' + name + '"]').forEach(function(slot) {
                slot.textContent = String(slots[name]);
            });
        });
    }
    if (handlers) {
        Object.keys(handlers).forEach(function(action) {
            el.querySelectorAll('[data-action="' + action + '"]').forEach(function(btn) {
                btn.addEventListener('click', handlers[action]);
            });
        });
    }
    return el;
}
window.renderTemplate = renderTemplate;
```

### 2.4 CSS-классы для inline-стилей

Добавить в `css/ui.css`:

```css
/* Модальные окна */
.modal-section { text-align: center; margin: 8px 0 10px 0; }
.modal-divider { height: 1px; background: #444; opacity: 0.6; margin: 8px 0; }
.modal-icon-block { 
    text-align: center; margin-bottom: 16px; padding: 12px;
    background: #1a1a1a; border: 1px solid #654321;
    border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.4);
}
.modal-icon-large { font-size: 3em; }
.modal-title-text { 
    font-size: 1.2em; font-weight: 600;
    color: #cd853f; margin-top: 8px;
}

/* Секции */
.section-title { margin: 6px 0; color: #cd853f; text-align: center; }

/* Flex-контейнеры */
.flex-center { display: flex; justify-content: center; gap: 10px; }
.flex-column { display: flex; flex-direction: column; gap: 8px; }
.flex-wrap { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
```

### 2.5 Миграция adventure.js

> **Статус:** Выполнено. Основной файл разделен, а его UI-части (`setup.js`, `ui.js`) переведены на шаблоны.

## Приоритет файлов для миграции

1. `js/screens/adventure/raids.js` - переведено
2. `js/screens/adventure/encounters.js` - переведено (через `ui.js`)
3. `js/screens/adventure/ui.js` - переведено
4. `js/screens/adventure.js` - переведено (очищен от UI)

## Ожидаемый результат

- Сокращение кода на ~300-400 строк
- Единообразный стиль через CSS-классы
- Лёгкая темизация через CSS custom properties
- Упрощение поддержки UI

## Как выполнить

```
1. Добавить renderTemplate() в uiToolkit.js
2. Добавить CSS-классы в ui.css
3. Создать шаблоны в templates.html
4. Поэтапно мигрировать файлы
5. Тестировать после каждой миграции
```

