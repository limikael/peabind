import {ifdefWrap} from "../utils/lang-util.js";

export default class ClassRenderer {
	constructor({idl, cls, prefix, idlRenderer}) {
		this.idl=idl;
		this.cls=cls;
		this.prefix=prefix;
        this.idlRenderer=idlRenderer;

        this.fr=(...args)=>this.idlRenderer.fr(...args);
        this.tr=(...args)=>this.idlRenderer.tr(...args);
	}

    getCtorFunc() {
        return ({
            name: this.cls.name,
            args: this.cls.ctorArgs,
            return: {type: "void"},
            ctor: true
        });
    }

	generateSignature() {
		return ifdefWrap(this.cls.ifdef,`
            class ${this.cls.name} {
            public:
                ${this.fr(this.getCtorFunc()).generateSignature()}
                ${this.cls.name}(InstanceIdTag instanceIdTag);
                ~${this.cls.name}();
                ${this.cls.methods.map(m=>this.fr(m).generateSignature()).join("\n")}
                static std::shared_ptr<${this.cls.name}> createInstanceProxy(int instanceId_);
                int instanceId;
            };
		`);
	}

    generateForwardSignature() {
        return ifdefWrap(this.cls.ifdef,`
            class ${this.cls.name};
        `);
    }

    getId() {
        let names=this.idl.classes.map(c=>c.name);
        if (names.indexOf(this.cls.name)<0)
            throw new Error("unknown class: "+this.cls.name);

        return ((1+names.indexOf(this.cls.name))*1000);
    }

    getExtClassName() {
        let name=this.cls.name;
        if (this.cls.namespace)
            name=`${this.cls.namespace}::${this.cls.name}`;

        return name;
    }
}
