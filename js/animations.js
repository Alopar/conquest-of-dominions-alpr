(function () {
	const DURATION = {
		attack: 420,
		hit: 380,
		kill: 600,
		dodge: 340
	};

	const GAP = {
		attackToImpact: 220,
		impactToDeath: 200
	};

	const keyOf = (unitId, army) => `${army}::${unitId}`;
	window._pendingKillVisual = window._pendingKillVisual || new Set();
	window.isKillPending = function(unitId, army){
		return window._pendingKillVisual.has(keyOf(unitId, army));
	};

	window._animQueue = window._animQueue || [];
	window.queueAnimation = function (evt) {
		if (evt && evt.type === 'kill') {
			window._pendingKillVisual.add(keyOf(evt.unitId, evt.army));
		}
		window._animQueue.push(evt);
	};

	function applyEvt(evt) {
		const selector = `.army-line [data-unit-id="${evt.unitId}"][data-army="${evt.army}"]`;
		const el = document.querySelector(selector);
		if (!el) return;

		if (evt.type === 'attack') {
			const cls = evt.army === 'attackers' ? 'anim-attack-up' : 'anim-attack-down';
			el.classList.add(cls);
			setTimeout(() => el.classList.remove(cls), DURATION.attack);
			return;
		}

		if (evt.type === 'hit') {
			const color = (evt.hitColor === 'yellow') ? 'anim-hit-yellow' : 'anim-hit-red';
			setTimeout(() => {
				el.classList.add(color);
				setTimeout(() => el.classList.remove(color), DURATION.hit);
			}, GAP.attackToImpact);
			return;
		}

		if (evt.type === 'kill') {
			const delay = GAP.attackToImpact + DURATION.hit + GAP.impactToDeath;
			setTimeout(() => {
				try {
					const hp = el.querySelector('.hp-bar');
					const w = hp ? hp.style.width : '';
					el.innerHTML = `💀` + (w ? `<div class="hp-bar" style="width: ${w}"></div>` : '');
				} catch {}
				window._pendingKillVisual.delete(keyOf(evt.unitId, evt.army));
				el.classList.add('anim-kill');
				setTimeout(() => el.classList.remove('anim-kill'), DURATION.kill);
			}, delay);
			return;
		}

		if (evt.type === 'dodge') {
			const cls = evt.army === 'attackers' ? 'anim-dodge-down' : 'anim-dodge-up';
			setTimeout(() => {
				el.classList.add(cls);
				setTimeout(() => el.classList.remove(cls), DURATION.dodge);
			}, GAP.attackToImpact);
			return;
		}
	}

	window.applyPendingAnimations = function () {
		const queued = window._animQueue.splice(0);
		queued.forEach(applyEvt);
	};
})();


