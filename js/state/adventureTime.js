import { eventBus } from '../core/eventBus.js';

export function init() {
    if (!window.adventureState) return;
    window.adventureState.days = 1;
}

export function getCurrentDay() {
    return (window.adventureState && window.adventureState.days) || 1;
}

export function addDays(amount) {
    if (!window.adventureState) return;
    const oldDay = getCurrentDay();
    const delta = Math.max(0, Number(amount || 0));
    window.adventureState.days = oldDay + delta;
    const newDay = window.adventureState.days;
    
    try {
        if (eventBus && typeof eventBus.emit === 'function') {
            eventBus.emit('adventure:dayPassed', { 
                oldDay: oldDay, 
                newDay: newDay, 
                delta: delta 
            });
        }
    } catch {}
    
    return { oldDay, newDay, delta };
}

export const AdventureTime = {
    init,
    getCurrentDay,
    addDays
};


