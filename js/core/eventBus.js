import { safeCall } from './errorHandler.js';

/**
 * @typedef {Object} EventBus
 * @property {function(string, Function): void} on
 * @property {function(string, Function): void} off
 * @property {function(string, *): void} emit
 */

const listeners = new Map();

/**
 * @param {string} eventName
 * @param {Function} handler
 */
export function on(eventName, handler) {
    if (!eventName || typeof handler !== 'function') return;
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(handler);
}

/**
 * @param {string} eventName
 * @param {Function} handler
 */
export function off(eventName, handler) {
    var set = listeners.get(eventName);
    if (!set) return;
    set.delete(handler);
}

/**
 * @param {string} eventName
 * @param {*} payload
 */
export function emit(eventName, payload) {
    var set = listeners.get(eventName);
    if (!set) return;
    var fns = Array.from(set);
    for (var i = 0; i < fns.length; i++) {
        safeCall(function() { fns[i](payload); }, undefined, 'eventBus:' + eventName);
    }
}

/** @type {EventBus} */
export const eventBus = { on, off, emit };
