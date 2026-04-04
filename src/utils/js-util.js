export class DeclaredError extends Error {
    constructor(...args) {
        super(...args);
        this.declared=true;
    }
}
