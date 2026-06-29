import {ifdefWrap} from "../utils/lang-util.js";
import {idlGetClass} from "../idl/peabind-idl.js";
import ClassRenderer from "../idl/ClassRenderer.js";

export default class PeabindJsvalClassRenderer extends ClassRenderer {
    generateClassId() {
        return `
            JSVAL ${this.idlRenderer.prefix}${this.cls.name}_id;
        `;
    }

    generateDef() {
        let cls=this.cls;

        let params=cls.ctorArgs.map((a,i)=>`a${i}`).join(",");
        let ctor;

        if (cls.constructible) {
            ctor=`
                static JSVAL ${this.idlRenderer.prefix}${cls.name}_constructor(JSVAL thisobj, int argc, JSVAL *argv) {
                    if (argc!=${cls.ctorArgs.length}) {
                        Opaque *opaque=new Opaque(nullptr,thisobj);
                        ${this.idlRenderer.prefix}context->opaques.push_back(opaque);
                        jsvalSetOpaque(thisobj,opaque);
                        return jsvalThrow("wrong ctor arg count");
                    }
                    ${cls.ctorArgs.map((a,i)=>this.tr(a).nativeDecl(`a${i}`)).join("\n")}
                    ${cls.ctorArgs.map((a,i)=>this.tr(a).unpack(`a${i}`,`argv[${i}]`)).join("\n")}
                    auto instance=std::make_shared<${this.getExtClassName()}>(${params});
                    Opaque *opaque=new Opaque(instance,thisobj);
                    ${this.idlRenderer.prefix}context->opaques.push_back(opaque);
                    jsvalSetOpaque(thisobj,opaque);
                    return thisobj;
                }
            `;
        }

        else {
            ctor=`
                static JSVAL ${this.idlRenderer.prefix}${cls.name}_constructor(JSVAL thisobj, int argc, JSVAL *argv) {
                    Opaque *opaque=new Opaque(nullptr,thisobj);
                    ${this.idlRenderer.prefix}context->opaques.push_back(opaque);
                    jsvalSetOpaque(thisobj,opaque);
                    return jsvalThrow(\"private constructor\");
                }
            `;
        }

        return ifdefWrap(cls.ifdef,`
            ${ctor}

            static void ${this.idlRenderer.prefix}${cls.name}_finalizer(JSVAL thisobj) {
                if (!${this.idlRenderer.prefix}context) {
                    //printf("class dtor, engine gone...\\n");
                    return;
                }

                Opaque *opaque=(Opaque *)jsvalGetOpaque(thisobj);
                /*if (!opaque) {
                    printf("it is already gone dead...\\n");
                    return;
                }*/
                auto it = std::find(${this.idlRenderer.prefix}context->opaques.begin(), ${this.idlRenderer.prefix}context->opaques.end(), opaque);
                assert(it != ${this.idlRenderer.prefix}context->opaques.end());
                ${this.idlRenderer.prefix}context->opaques.erase(it);
                delete opaque;
            }

            ${this.getMethodRenderers().map(m=>m.generateDef()).join("\n")}
            ${this.generateEventDefs()}
        `);
    }

    generateReg() {
        let cls=this.cls;
        return ifdefWrap(cls.ifdef,`
            ${this.idlRenderer.prefix}${cls.name}_id=jsvalCreateClass(${this.prefix}${cls.name}_constructor);
            jsvalSetClassFinalizer(${this.prefix}${cls.name}_id,${this.prefix}${cls.name}_finalizer);
            jsvalSetProp(mod,"${cls.name}",${this.prefix}${cls.name}_id);

            ${this.getMethodRenderers().map(m=>m.generateReg()).join("\n")}

            ${cls.events.length?`
                jsvalSetProtoProp(${this.prefix}${cls.name}_id,"on",jsvalCreateFunc(${this.prefix}${cls.name}_on));
                jsvalSetProtoProp(${this.prefix}${cls.name}_id,"off",jsvalCreateFunc(${this.prefix}${cls.name}_off));
            `:""}

            ${Object.keys(cls.const).map(c=>`
                jsvalSetProp(${this.prefix}${cls.name}_id,"${c}",jsvalCreateInt(${cls.const[c]}));
            `).join("\n")}
        `);
    }

    getMethodRenderers() {
        let hierarcyName=this.cls.name;
        let methods=[];

        while (hierarcyName) {
            methods.push(...idlGetClass(this.idl,hierarcyName).methods);
            hierarcyName=idlGetClass(this.idl,hierarcyName).extends;
        }

        return methods.map(m=>{
            m=structuredClone(m);
            m.className=this.cls.name;
            return m;
        }).map(m=>this.fr(m));
    }

    generateEventDefs() {
        let cls=this.cls;

        if (!cls.events.length)
            return "";

        return `
            static JSVAL ${this.idlRenderer.prefix}${cls.name}_on(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=2)
                    return jsvalThrow("worng arg count for on");

                std::shared_ptr<${this.tr(cls.name).getTemplateParam()}> instance=${this.prefix}context->unpack<${this.tr(cls.name).getTemplateParam()}>(thisobj,${this.prefix}${cls.name}_id);
                std::string eventName=jsvalToStdString(argv[0]);
                JSVAL cbVal=argv[1];
                //JSVAL_ID cbId=jsvalGetObjectId(cbVal);
                ${cls.events.map(event=>this.er(event).generateOnDef()).join("\n")}
                return jsvalUndefined();
            }

            static JSVAL ${this.idlRenderer.prefix}${cls.name}_off(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=2)
                    return jsvalThrow("worng arg count for off");

                std::shared_ptr<${this.tr(cls.name).getTemplateParam()}> instance=${this.prefix}context->unpack<${this.tr(cls.name).getTemplateParam()}>(thisobj,${this.prefix}${cls.name}_id);
                std::string eventName=jsvalToStdString(argv[0]);
                JSVAL cbVal=argv[1];
                JSVAL_ID cbId=jsvalGetObjectId(cbVal);
                ${cls.events.map(event=>this.er(event).generateOffDef()).join("\n")}
                return jsvalUndefined();
            }
        `
    }
}
