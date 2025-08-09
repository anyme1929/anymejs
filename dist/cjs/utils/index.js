'use strict';

function isObject(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        !Array.isArray(obj) &&
        Object.prototype.toString.call(obj) === "[object Object]");
}
function deepMerge(target, ...sources) {
    if (!sources.length)
        return target;
    const result = { ...target };
    for (const source of sources) {
        for (const key in source) {
            if (isObject(source[key]) && key in target)
                result[key] = deepMerge(target[key], source[key]);
            else
                result[key] = source[key];
        }
    }
    return result;
}
function isEmpty(value) {
    if (!value)
        return true;
    if (typeof value === "string" ||
        Array.isArray(value) ||
        (typeof value === "object" &&
            "length" in value &&
            typeof value.length === "number")) {
        return value.length === 0;
    }
    if (value instanceof Map || value instanceof Set) {
        return value.size === 0;
    }
    if (Object.prototype.toString.call(value) === "[object Object]") {
        return Object.keys(value).length === 0;
    }
    return false;
}
function defineConfig(config) {
    return config;
}

exports.deepMerge = deepMerge;
exports.defineConfig = defineConfig;
exports.isEmpty = isEmpty;
exports.isObject = isObject;
//# sourceMappingURL=index.js.map
