(function(){
    const LS_KEY = 'heroState';

    let state = {
        classId: null,
        ownedUpgradeIds: [],
        purchasedLevel: 0
    };

    function save(){
        try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
    }

    function load(){
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') state = Object.assign({}, state, parsed);
        } catch {}
    }

    function reset(){
        state = { classId: null, ownedUpgradeIds: [], purchasedLevel: 0 };
        save();
    }

    function setClassId(id){
        state.classId = id || null;
        state.ownedUpgradeIds = [];
        state.purchasedLevel = 0;
        save();
        try { if (window.Development && typeof window.Development.initForClass === 'function') window.Development.initForClass(id); } catch {}
    }

    function getClassId(){ return state.classId; }

    function getClassDef(){
        try {
            const classesCfg = (window.StaticData && typeof window.StaticData.getConfig === 'function') ? window.StaticData.getConfig('heroClasses') : null;
            const list = classesCfg && Array.isArray(classesCfg.classes) ? classesCfg.classes : (Array.isArray(classesCfg) ? classesCfg : []);
            return list.find(function(x){ return x && x.id === state.classId; }) || null;
        } catch { return null; }
    }

    function getStartingArmy(){
        const def = getClassDef();
        const arr = (def && Array.isArray(def.startingArmy)) ? def.startingArmy : [];
        return arr.map(function(g){ return { id: g.id, count: g.count }; });
    }

    function addOwnedUpgrades(ids){
        const set = new Set(state.ownedUpgradeIds || []);
        (ids || []).forEach(function(id){ if (id) set.add(id); });
        state.ownedUpgradeIds = Array.from(set);
        save();
    }

    function hasUpgrade(id){ return (state.ownedUpgradeIds || []).includes(id); }

    function getPurchasedLevel(){ return Number(state.purchasedLevel || 0); }

    function setPurchasedLevel(lvl){ state.purchasedLevel = Math.max(0, Number(lvl||0)); save(); }

    load();

    window.Hero = {
        reset,
        load,
        save,
        setClassId,
        getClassId,
        getClassDef,
        getStartingArmy,
        addOwnedUpgrades,
        hasUpgrade,
        getPurchasedLevel,
        setPurchasedLevel
    };
})();


