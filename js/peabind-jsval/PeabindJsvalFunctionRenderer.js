import {ifdefWrap} from "../utils/lang-util.js";
import FunctionRenderer from "../idl/FunctionRenderer.js";

export default class PeabindJsvalFunctionRenderer extends FunctionRenderer {
    generateDef() {
        let func=this.func;

        let name,prelude,callTarget,argStart;
        if (func.className) {
            if (func.static) {
                name=`${this.idlRenderer.prefix}${func.className}_${func.name}`;
                prelude="";
                callTarget=`${this.cr(func.className).getExtClassName()}::${func.name}`
            }

            else {
                name=`${this.idlRenderer.prefix}${func.className}_${func.name}`;
                prelude=`
                    Opaque *opaque=(Opaque *)jsvalGetOpaque(thisobj);
                    assert(opaque!=NULL);
                    std::shared_ptr<${this.cr(func.className).getExtClassName()}> instance=std::static_pointer_cast<${this.cr(func.className).getExtClassName()}>(opaque->instance);
                `;
                callTarget=`instance->${func.name}`;
            }
        }

        else {
            name=`${this.idlRenderer.prefix}${func.name}`;
            prelude="";
            callTarget=`${func.name}`;
            if (func.namespace)
                callTarget=`${func.namespace}::${func.name}`
        }

        let call;
        if (func.return.type=="void" && !func.return.promise) {
            call=`
                ${callTarget}(${func.args.map((arg,i)=>`a${i}`).join(",")});
                return jsvalUndefined();
            `;
        }

        else {
            call=`
                ${this.tr(func.return).nativeDecl("ret")}
                ret=${callTarget}(${func.args.map((arg,i)=>`a${i}`).join(",")});
                ${this.tr(func.return).abiDecl("retval")}
                ${this.tr(func.return).pack("retval","ret")}
                return retval;
            `;
        }

        return ifdefWrap(func.ifdef,`
            static JSVAL ${name}(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=${func.args.length}) return jsvalThrow(\"wrong arg count\");
                ${prelude}
                ${func.args.map((a,i)=>this.tr(a).nativeDecl(`a${i}`)).join("\n")}
                ${func.args.map((a,i)=>this.tr(a).unpack(`a${i}`,`argv[${i}]`)).join("\n")}
                ${call}
            }
        `);
    }

    generateReg() {
        let func=this.func;

        if (func.className) {
            if (func.static) {
                return ifdefWrap(func.ifdef,`
                    jsvalSetProp(${this.idlRenderer.prefix}${func.className}_id,"${func.name}",jsvalCreateFunc(${this.prefix}${func.className}_${func.name}));
                `);
            }

            else {
                return ifdefWrap(func.ifdef,`
                    jsvalSetProtoProp(${this.idlRenderer.prefix}${func.className}_id,"${func.name}",jsvalCreateFunc(${this.prefix}${func.className}_${func.name}));
                `);
            }
        }

        else {
            return ifdefWrap(func.ifdef,`
                jsvalSetProp(mod,"${func.name}",jsvalCreateFunc(${this.idlRenderer.prefix}${func.name}));
            `);
        }
    }
}