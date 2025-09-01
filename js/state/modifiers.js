(function(){
    const LS_KEY = 'modifiers:ownedPerks';

    let ownedPerkIds = [];
    let aggregates = {
        attackers: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } },
        defenders: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } }
    };
    let activeEffects = [];

    function load(){
        try { const raw = localStorage.getItem(LS_KEY); if (raw) ownedPerkIds = JSON.parse(raw) || []; } catch {}
        if (!Array.isArray(ownedPerkIds)) ownedPerkIds = [];
        recompute();
    }

    function save(){ try { localStorage.setItem(LS_KEY, JSON.stringify(ownedPerkIds)); } catch {} }

    function setOwnedPerks(ids){
        ownedPerkIds = Array.isArray(ids) ? ids.slice() : [];
        save();
        recompute();
    }

    function addOwnedPerk(id){
        if (!id) return;
        if (!ownedPerkIds.includes(id)) {
            ownedPerkIds.push(id);
            save();
            recompute();
        }
    }

    function getPerksConfig(){
        try {
            const cfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('perks') : null;
            const list = cfg && Array.isArray(cfg.perks) ? cfg.perks : [];
            return list;
        } catch { return []; }
    }

    function recompute(){
        const next = {
            attackers: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } },
            defenders: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } }
        };
        const effects = [];
        // Берём фактически выданные перки из системы перков (если доступна)
        let owned = [];
        try { owned = (window.Perks && typeof window.Perks.getOwned === 'function') ? window.Perks.getOwned() : []; } catch { owned = []; }
        if (!owned || owned.length === 0) {
            // Фолбэк на локальный список
            const perksCfg = getPerksConfig();
            const map = {}; perksCfg.forEach(function(p){ map[p.id] = p; });
            owned = (ownedPerkIds || []).map(function(id){ return map[id]; }).filter(Boolean);
        }
        (owned || []).forEach(function(perk){
            (Array.isArray(perk.effects) ? perk.effects : []).forEach(function(eff){
                if (!eff || eff.type !== 'stat' || typeof eff.path !== 'string') return;
                const path = eff.path;
                const role = String(path.split('.')[2] || '').toLowerCase();
                if (role !== 'melee' && role !== 'range' && role !== 'support') return;
                const v = Number(eff.value || 0);
                if (path.startsWith('combat.hp.')) {
                    next.attackers.hp[role] = (next.attackers.hp[role] || 0) + v;
                    if (v !== 0) effects.push({ type: 'stat', path: `combat.hp.${role}`, value: v, side: 'attackers' });
                } else if (path.startsWith('combat.damage.')) {
                    next.attackers.damage[role] = (next.attackers.damage[role] || 0) + v;
                    if (v !== 0) effects.push({ type: 'stat', path: `combat.damage.${role}`, value: v, side: 'attackers' });
                } else if (path.startsWith('combat.targets.')) {
                    const r2 = String(path.split('.')[2] || '').toLowerCase();
                    if (r2 === 'melee' || r2 === 'range' || r2 === 'support') {
                        next.attackers.targets[r2] = (next.attackers.targets[r2] || 0) + v;
                        if (v !== 0) effects.push({ type: 'stat', path: `combat.targets.${r2}`, value: v, side: 'attackers' });
                    }
                } else if (path === 'combat.support.targets') {
                    // Поддержка старого пути: влияет только на support
                    next.attackers.targets.support = (next.attackers.targets.support || 0) + v;
                    if (v !== 0) effects.push({ type: 'stat', path: 'combat.targets.support', value: v, side: 'attackers' });
                }
            });
        });
        aggregates = next;
        activeEffects = effects;
        try {
            if (window.AppState && window.AppState.subscreen === 'mods' && typeof window.renderModsDebug === 'function') window.renderModsDebug();
        } catch {}
    }

    function reset(){
        aggregates = { attackers: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } }, defenders: { hp: { melee: 0, range: 0, support: 0 }, damage: { melee: 0, range: 0, support: 0 }, targets: { melee: 0, range: 0, support: 0 } } };
        activeEffects = [];
    }

    function resetAndRecompute(){ reset(); recompute(); }

    function getHpBonus(side, role){
        const s = (side === 'defenders') ? 'defenders' : 'attackers';
        const r = (role === 'range' || role === 'support') ? role : 'melee';
        try { return Number(aggregates[s].hp[r] || 0); } catch { return 0; }
    }

    function getDamageBonus(side, role){
        const s = (side === 'defenders') ? 'defenders' : 'attackers';
        const r = (role === 'range' || role === 'support') ? role : 'melee';
        try { return Number(aggregates[s].damage[r] || 0); } catch { return 0; }
    }

    function getTargetsBonus(side, role){
        const s = (side === 'defenders') ? 'defenders' : 'attackers';
        const r = (role === 'range' || role === 'support') ? role : 'melee';
        try { return Number(aggregates[s].targets[r] || 0); } catch { return 0; }
    }

    function getSnapshot(){
        return JSON.parse(JSON.stringify({ ownedPerkIds, aggregates, activeEffects }));
    }

    load();

    window.Modifiers = {
        setOwnedPerks,
        addOwnedPerk,
        recompute,
        reset,
        resetAndRecompute,
        getHpBonus,
        getDamageBonus,
        getTargetsBonus,
        getSnapshot
    };
})();


