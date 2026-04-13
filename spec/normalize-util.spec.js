import {normalizeStringOrObject} from "../js/utils/normalize-util.js";

describe("normalize-util",()=>{
	it("can normalize",()=>{
		let o;

		o=normalizeStringOrObject("int","type");
		expect(o).toEqual({type:"int"});
		o=normalizeStringOrObject({type:"int"},"type");
		expect(o).toEqual({type:"int"});

		o=normalizeStringOrObject(undefined,"type","void");
		expect(o).toEqual({type: "void"});
		o=normalizeStringOrObject(undefined,"type",{type: "void"});
		expect(o).toEqual({type: "void"});

		o=normalizeStringOrObject(undefined,"type",{type: "void"});
		expect(o).toEqual({type: "void"});
	})
});
