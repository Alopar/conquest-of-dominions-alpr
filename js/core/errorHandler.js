/**
 * @param {Function} fn
 * @param {*} [fallback]
 * @param {string} [context]
 * @returns {*}
 */
export function safeCall(fn, fallback, context) {
    try {
        return fn();
    } catch (e) {
        if (context) {
            console.warn('[' + context + ']', e.message || e);
        }
        return fallback;
    }
}

/**
 * @param {Promise} promise
 * @param {*} [fallback]
 * @param {string} [context]
 * @returns {Promise<*>}
 */
export async function safeAsync(promise, fallback, context) {
    try {
        return await promise;
    } catch (e) {
        if (context) {
            console.warn('[' + context + ']', e.message || e);
        }
        return fallback;
    }
}

/**
 * @param {string} moduleName
 * @param {string} methodName
 * @returns {Function|null}
 */
export function getGlobalMethod(moduleName, methodName) {
    var mod = window[moduleName];
    if (!mod) return null;
    var method = mod[methodName];
    if (typeof method !== 'function') return null;
    return method;
}

/**
 * @param {string} moduleName
 * @param {string} methodName
 * @param {Array} [args]
 * @param {*} [fallback]
 * @returns {*}
 */
export function callIfExists(moduleName, methodName, args, fallback) {
    var method = getGlobalMethod(moduleName, methodName);
    if (!method) return fallback;
    try {
        return method.apply(null, args || []);
    } catch (e) {
        console.warn('[' + moduleName + '.' + methodName + ']', e.message || e);
        return fallback;
    }
}

/**
 * @param {string} moduleName
 * @param {string} methodName
 * @param {Array} [args]
 * @param {*} [fallback]
 * @returns {Promise<*>}
 */
export async function callIfExistsAsync(moduleName, methodName, args, fallback) {
    var method = getGlobalMethod(moduleName, methodName);
    if (!method) return fallback;
    try {
        return await method.apply(null, args || []);
    } catch (e) {
        console.warn('[' + moduleName + '.' + methodName + ']', e.message || e);
        return fallback;
    }
}


