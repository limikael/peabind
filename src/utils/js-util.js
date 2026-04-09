export class DeclaredError extends Error {
    constructor(...args) {
        super(...args);
        this.declared=true;
    }
}

export function arrayify(a) {
    if (!a)
        a=[];

    if (!Array.isArray(a))
        a=[a];

    return a.flat(Infinity);
}
