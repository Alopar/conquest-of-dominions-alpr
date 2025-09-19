## UI Toolkit — контракт

Источник: `js/ui/uiToolkit.js` и вызовы из `js/ui/ui.js`.

### Базовые функции
- showModal(body, options)
- showToast(kind, text, timeout)
- attachTooltip(el, factory, { delay, hideDelay })
- clearTooltips()
- ensureScreenLoaded(domId, fragmentPath)
- ensureMenuBar(domId, { backLabel, back })

Требование: заголовки модалок центрированы.

### Конфиг-панели
- mountConfigPanel(host, opts) — используется экраном «Схватка».


### Тосты (UI.showToast)
- Поддерживаемые типы: info (по умолчанию), success, error, copper, silver, gold
- Позиция: правый верх; максимум 5 активных; кнопка закрытия
- Таймаут: 3c (info/success/error), 5c (copper/silver/gold) по умолчанию

### Модальные окна (UI.showModal)
- type: info | confirm | dialog
- Заголовок центрируется; для dialog доступны yesText/noText, yesDisabled
- Esc закрывает info; для confirm/dialog — Enter активирует ок/yes
