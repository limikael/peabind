import {arrayify} from "./js-util.js";

export function normalizeAlternative(val, alternatives=[]) {
    if (!alternatives.includes(val))
        throw new Error("Expected one of: "+alternatives.toString()+", not: "+val);

    return val;
}

export function normalizeFlags(val, alternatives=[]) {
    val=normalizeStringArray(val);
    val.map(item=>normalizeAlternative(item,alternatives));
    return val;
}

export function normalizeObjectKeys(obj, keys=[]) {
    normalizeFlags(Object.keys(obj),keys);
    return obj;
}

export function normalizeStringArray(a) {
    a=arrayify(a);
    a.map(item=>{
        if (typeof item!="string")
            throw new Error("Expected string in: "+JSON.stringify(a));
    });

    return a;
}

export function normalizeMapOrArray(input, { key = "name" } = {}) {
    if (!input) return []

    if (Array.isArray(input)) {
        return input.map(item => {
            if (!item[key]) throw new Error(`Missing ${key}`)
            return item
        })
    }

    if (typeof input === "object") {
        return Object.entries(input).map(([k, v]) => {
            if (v[key] && v[key] !== k) {
                throw new Error(`Name mismatch: ${k} vs ${v[key]}`)
            }
            return { [key]: k, ...v }
        })
    }

    throw new Error("Expected object or array")
}

export function normalizeStringOrObject(input, key, def) {
    if (input===undefined && typeof def=="string")
        input=def;

    if (input===undefined && def!==undefined)
        input={...def};

    if (typeof input === "string") {
        return { [key]: input }
    }

    if (typeof input === "object" && input !== null) {
        if (!input[key]) {
            throw new Error(`Missing required key "${key}"`)
        }
        return input
    }

    throw new Error(`Expected string or object for ${key}`)
}

export function normalizeArray(x) {
    if (!x) return []
    if (!Array.isArray(x)) throw new Error("Expected array")
    return x
}

export function normalizeObjectDefaults(x, def={}) {
    if (!x) return {...def};
    if (Array.isArray(x) || typeof(x)!=="object")
        throw new Error("Expected object")

    return {...def, ...x};
}

export function normalizeBuildIndex(a, prop="name") {
    return Object.fromEntries(a.map(o=>[o[prop],o]));
}