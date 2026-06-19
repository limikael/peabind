import path from "node:path";

export default class IdlRenderer {
	constructor({idl, output, prefix, namespace, functionRendererClass, classRendererClass}) {
	    this.projectName=path.basename(output).slice(0,-4);
    	if (!prefix)
        	prefix=this.projectName.replaceAll(".","_")+"_";

		this.idl=idl;
		this.namespace=namespace;
		this.output=output;
		this.prefix=prefix;
		this.functionRendererClass=functionRendererClass;
		this.classRendererClass=classRendererClass;

		this.fn=(...args)=>this.getFunc(...args);
    	this.cls=(...args)=>this.getClass(...args);
	}

	getOutput(prefix) {
		if (prefix)
			return this.output.slice(0,-4)+".h";		

		return this.output;
	}

	getFunc(funcDef) {
        return new this.functionRendererClass({idl: this.idl, prefix: this.prefix, func: funcDef});
	}

	getClass(clsDef) {
        return new this.classRendererClass({idl: this.idl, prefix: this.prefix, cls: clsDef});
	}
}