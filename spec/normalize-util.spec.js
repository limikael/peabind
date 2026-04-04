import {normalizeStringOrObject} from "../src/utils/normalize-util.js";

describe("normalize-util",()=>{
	it("can normalize",()=>{
		let o;

		o=normalizeStringOrObject("int","type");
		expect(o).toEqual({type:"int"});
		o=normalizeStringOrObject({type:"int"},"type");
		expect(o).toEqual({type:"int"});
	})
});
