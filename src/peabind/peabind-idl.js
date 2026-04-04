import {normalizeMapOrArray, normalizeArray, normalizeBuildIndex,
		normalizeStringOrObject} from "../utils/normalize-util.js";

export function peabindParse(def) {
	if (typeof def=="string")
		def=JSON.parse(def);

	def.include=normalizeArray(def.include);

	def.functions=normalizeMapOrArray(def.functions,"name");
	def.functionsByName=normalizeBuildIndex(def.functions,"name");

	for (let f of def.functions)
		f.args=normalizeArray(f.args).map(a=>normalizeStringOrObject(a,"type"));

	def.classes=normalizeMapOrArray(def.classes,"name");
	def.classesByName=normalizeBuildIndex(def.classes,"name");

	for (let c of def.classes) {
		c.ctorArgs=normalizeArray(c.ctorArgs).map(a=>normalizeStringOrObject(a,"type"));
		c.methods=normalizeMapOrArray(c.methods,"name");
		for (let m of c.methods)
			m.args=normalizeArray(m.args).map(a=>normalizeStringOrObject(a,"type"));
	}

	return def;
}