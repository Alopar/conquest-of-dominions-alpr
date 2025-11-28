import { safeCall, safeAsync, callIfExists, callIfExistsAsync, getGlobalMethod } from './core/errorHandler.js';
import { rollDice, parseDamage, getMaxDamageValue } from './core/dice.js';
import { eventBus } from './core/eventBus.js';
import { arrangeUnitsIntoFormation, rollToHit, applyDamageToTarget, selectNextTarget } from './core/combat.js';
import { getUnitRole, selectTargetByRules } from './core/targeting.js';
import { assignLinesToArmy, rebuildArmyLines } from './core/formations.js';
import { createUnit } from './core/unitFactory.js';
import { initializeArmies, getFirstSide } from './core/battleSetup.js';
import { executeStep, step, nextTurn, resetBattle } from './core/battleLoop.js';
import { StaticData } from './state/staticData.js';
import { GameSettings } from './state/gameSettings.js';
import { Modifiers } from './state/modifiers.js';
import { Perks } from './state/perks.js';
import { Achievements } from './state/achievements.js';
import { Hero } from './state/hero.js';
import { Tracks } from './state/tracks.js';
import { Development } from './state/development.js';
import { Rewards } from './state/rewards.js';
import { AdventureTime } from './state/adventureTime.js';
import { Raids } from './state/raids.js';

// Bridge for Legacy Scripts (Temporary)
window.safeCall = safeCall;
window.safeAsync = safeAsync;
window.callIfExists = callIfExists;
window.callIfExistsAsync = callIfExistsAsync;
window.getGlobalMethod = getGlobalMethod;

window.rollDice = rollDice;
window.parseDamage = parseDamage;
window.getMaxDamageValue = getMaxDamageValue;

window.eventBus = eventBus;

window.arrangeUnitsIntoFormation = arrangeUnitsIntoFormation;
window.rollToHit = rollToHit;
window.applyDamageToTarget = applyDamageToTarget;
window.selectNextTarget = selectNextTarget;

window.getUnitRole = getUnitRole;
window.selectTargetByRules = selectTargetByRules;

window.assignLinesToArmy = assignLinesToArmy;
window.rebuildArmyLines = rebuildArmyLines;

window.createUnit = createUnit;

window.initializeArmies = initializeArmies;
window.getFirstSide = getFirstSide;

window.executeStep = executeStep;
window.step = step;
window.nextTurn = nextTurn;
window.resetBattle = resetBattle;

window.StaticData = StaticData;
window.GameSettings = GameSettings;
window.Modifiers = Modifiers;
window.Perks = Perks;
window.Achievements = Achievements;
window.Hero = Hero;
window.Tracks = Tracks;
window.Development = Development;
window.Rewards = Rewards;
window.AdventureTime = AdventureTime;
window.Raids = Raids;

document.addEventListener('DOMContentLoaded', async function() {
    await safeAsync((async function() {
        if (!window._templatesLoaded) {
            var res = await fetch('fragments/templates.html', { cache: 'no-store' });
            if (res.ok) {
                var html = await res.text();
                var doc = new DOMParser().parseFromString(html, 'text/html');
                doc.querySelectorAll('template').forEach(function(t){ document.body.appendChild(t); });
                window._templatesLoaded = true;
            }
        }
    })(), undefined, 'app:loadTemplates');

    await StaticData.init();
    await GameSettings.init();
    await Achievements.init();

    await initializeSettings();

    await safeAsync((async function() {
        if (window.Router && typeof window.Router.setScreen === 'function') {
            await window.Router.setScreen('intro');
        } else if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
            await window.UI.ensureScreenLoaded('intro-screen', 'fragments/intro.html');
            callIfExists('window', 'showScreen', ['intro-screen'], undefined);
        }
    })(), undefined, 'app:initScreen');

    safeCall(function() { localStorage.removeItem('adventureState'); }, undefined, 'app:clearAdventureState');

    await safeAsync((async function() {
        if (window.StaticData && window.initBattleConfig) {
            var battleSetup = window.StaticData.getConfig && window.StaticData.getConfig('battleSetup');
            if (battleSetup) await window.initBattleConfig(battleSetup, 'static');
        }
    })(), undefined, 'app:initBattleConfig');

    safeCall(function() {
        window.addEventListener('keydown', function(e){
            if (e.key === 'Escape') {
                callIfExists('UI', 'closeTopModal', [], undefined);
                e.preventDefault();
            }
        }, true);
    }, undefined, 'app:escapeHandler');
});
