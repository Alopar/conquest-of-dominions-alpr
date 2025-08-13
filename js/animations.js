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

	window._animQueue = window._animQueue || [];
	window.queueAnimation = function (evt) {
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


