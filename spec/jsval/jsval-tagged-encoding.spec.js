import {
    jsvalIsTaggedInt,
    jsvalIntFits,
    jsvalTagInt,
    jsvalUntagInt,
} from "../../js/jsval/jsval-wasm.js";

const INT_MAX = (1 << 30) - 1;
const INT_MIN = -(1 << 30);

describe("jsval tagged-int encoding", () => {
    it("recognises which numbers fit in 31 signed bits", () => {
        expect(jsvalIntFits(0)).toBeTrue();
        expect(jsvalIntFits(1)).toBeTrue();
        expect(jsvalIntFits(-1)).toBeTrue();
        expect(jsvalIntFits(INT_MAX)).toBeTrue();
        expect(jsvalIntFits(INT_MIN)).toBeTrue();

        expect(jsvalIntFits(INT_MAX + 1)).toBeFalse();
        expect(jsvalIntFits(INT_MIN - 1)).toBeFalse();
        expect(jsvalIntFits(2 ** 31)).toBeFalse();

        expect(jsvalIntFits(1.5)).toBeFalse();
        expect(jsvalIntFits(NaN)).toBeFalse();
        expect(jsvalIntFits(Infinity)).toBeFalse();
        expect(jsvalIntFits("3")).toBeFalse();
        expect(jsvalIntFits(null)).toBeFalse();
        expect(jsvalIntFits(undefined)).toBeFalse();
        expect(jsvalIntFits(true)).toBeFalse();
    });

    it("tags ints with the high bit set", () => {
        expect(jsvalIsTaggedInt(jsvalTagInt(0))).toBeTrue();
        expect(jsvalIsTaggedInt(jsvalTagInt(1))).toBeTrue();
        expect(jsvalIsTaggedInt(jsvalTagInt(-1))).toBeTrue();
        expect(jsvalIsTaggedInt(jsvalTagInt(INT_MAX))).toBeTrue();
        expect(jsvalIsTaggedInt(jsvalTagInt(INT_MIN))).toBeTrue();

        // Positive non-negative JSVALs are handles, not tagged ints.
        expect(jsvalIsTaggedInt(1)).toBeFalse();
        expect(jsvalIsTaggedInt(42)).toBeFalse();
        expect(jsvalIsTaggedInt(0)).toBeFalse();
    });

    it("round-trips boundary values losslessly", () => {
        for (const v of [0, 1, -1, 2, -2, 42, -42, 1023, -1023, INT_MAX, INT_MIN]) {
            expect(jsvalUntagInt(jsvalTagInt(v))).withContext(`v=${v}`).toEqual(v);
        }
    });

    it("produces JSVALs that fit in 32 signed bits", () => {
        for (const v of [0, 1, -1, INT_MAX, INT_MIN]) {
            const tagged = jsvalTagInt(v);
            expect(tagged | 0).withContext(`v=${v}`).toEqual(tagged);
        }
    });
});
