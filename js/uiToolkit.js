(function(){
	async function ensureScreenLoaded(id, url) {
		if (document.getElementById(id)) return;
		const res = await fetch(url, { cache: 'no-store' });
		if (!res.ok) throw new Error('HTTP ' + res.status);
		const html = await res.text();
		const doc = new DOMParser().parseFromString(html, 'text/html');
		doc.querySelectorAll('template').forEach(t => document.body.appendChild(t));
		const el = doc.getElementById(id) || doc.querySelector('.screen');
		if (el) document.body.insertBefore(el, document.body.lastElementChild);
	}

	function ensureMenuBar(screenId, options) {
		try {
			const screen = document.getElementById(screenId);
			if (!screen) return;
			const existing = screen.querySelector('.menu-bar');
			if (existing) existing.remove();
			const mounted = mountTemplate('tpl-menu-bar', screen, {
				slots: { backLabel: (options && options.backLabel) || 'Главная' },
				handlers: { back: (options && options.back) || (window.showIntro || function(){}) }
			});
			if (mounted && mounted.parentElement === screen) {
				try { screen.insertBefore(mounted, screen.firstElementChild || null); } catch {}
			}
			if (mounted && options && options.backId) {
				const btn = mounted.querySelector('[data-action="back"]');
				if (btn) btn.id = options.backId;
			}
		} catch {}
	}

	function mountTemplate(id, container, opts) {
		const tpl = document.getElementById(id);
		if (!tpl || !container) return null;
		const frag = tpl.content.cloneNode(true);
		const slots = (opts && opts.slots) || {};
		const handlers = (opts && opts.handlers) || {};
		Object.keys(slots).forEach(name => {
			frag.querySelectorAll('[data-slot="'+name+'"]').forEach(el => { el.textContent = String(slots[name]); });
		});
		Object.keys(handlers).forEach(name => {
			frag.querySelectorAll('[data-action="'+name+'"]').forEach(el => { el.addEventListener('click', handlers[name]); });
		});
		container.appendChild(frag);
		return container.lastElementChild;
	}

	function cloneTemplate(id) {
		const tpl = document.getElementById(id);
		return tpl ? tpl.content.cloneNode(true) : null;
	}

	function applyTableHead(tableEl, slots) {
		try {
			if (!tableEl) return;
			const tpl = document.getElementById('tpl-unit-table-head');
			if (!tpl) return;
			const frag = tpl.content.cloneNode(true);
			const thead = frag.querySelector('thead');
			if (!thead) return;
			const map = slots || {};
			// Заполняем заданные слоты
			Object.keys(map).forEach(name => {
				thead.querySelectorAll('[data-slot="'+name+'"]').forEach(el => { el.textContent = String(map[name]); });
			});
			// Удаляем неиспользуемые дополнительные колонки (кроме тех, для которых явно передано значение)
			['extraCol1','extraCol2','extraCol3','extraCol4'].forEach(name => {
				if (!(name in map)) {
					thead.querySelectorAll('[data-slot="'+name+'"]').forEach(el => el.remove());
				}
			});
			const old = tableEl.querySelector('thead');
			if (old) old.remove();
			tableEl.insertBefore(thead, tableEl.firstChild || null);
		} catch {}
	}

	function mountFileInput(container, options) {
		try {
			if (!container) return null;
			const groupRoot = mountTemplate('tpl-file-input', container, {
				slots: {
					labelText: (options && options.labelText) || 'Загрузить файл',
					buttonText: (options && options.buttonText) || '📁 ВЫБРАТЬ ФАЙЛ'
				}
			});
			const input = groupRoot ? groupRoot.querySelector('input[type="file"]') : null;
			const btn = groupRoot ? groupRoot.querySelector('[data-action="open"]') : null;
			const label = groupRoot ? groupRoot.querySelector('.file-label') : null;
			if (groupRoot) container.appendChild(groupRoot);
			if (label && options && options.showLabel === false) {
				label.remove();
			}
			if (input) {
				if (options && options.accept) input.setAttribute('accept', options.accept);
				if (options && options.id) input.id = options.id;
			}
			if (label && input && (options && options.id)) {
				label.setAttribute('for', options.id);
			}
			if (btn && input) {
				btn.addEventListener('click', function(){ input.click(); });
			}
			if (input) {
				input.addEventListener('change', function(){
					try {
						if (btn && input.files && input.files[0]) btn.textContent = input.files[0].name;
						if (options && typeof options.onFile === 'function' && input.files && input.files[0]) {
							options.onFile(input.files[0]);
						}
					} catch {}
				});
			}
			return groupRoot;
		} catch { return null; }
	}

	window.UI = { ensureScreenLoaded, ensureMenuBar, mountTemplate, cloneTemplate, applyTableHead, mountFileInput };
})();


