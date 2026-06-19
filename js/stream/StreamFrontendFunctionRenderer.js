import FunctionRenderer from "../idl/FunctionRenderer.js";
import {ifdefWrap} from "../utils/lang-util.js";

export default class StreamFrontendFunctionRenderer extends FunctionRenderer {
    generateFrontendStub() {
        let args=this.func.args.map((a,i)=>this.tr(a).nativeParam(`arg_${i}`)).join(",");
        let declName=this.func.name;
        let instanceIdExpr="0";
        if (this.func.className) {
            declName=`${this.func.className}::${this.func.name}`;
            instanceIdExpr="instanceId";
        }

        let epilogue="";
        if (this.func.return.type!="void" || this.func.return.promise) {
            epilogue=`
                ${this.tr(this.func.return).nativeDecl("ret")}
                ${this.tr(this.func.return).cborUnpack("ret","res")}
                return ret;
            `;
        }

        return ifdefWrap(this.func.ifdef,`
            ${this.tr(this.func.return).nativeType()} ${declName}(${args}) {
                std::vector<uint8_t> req;
                size_t numParams=${this.func.args.length+3};
                int thisId=${instanceIdExpr};
                CborLite::encodeArraySize(req,numParams);
                CborLite::encodeInteger(req,PEABIND_STREAMOP_CALL);
                CborLite::encodeInteger(req,${this.getId()});
                CborLite::encodeInteger(req,thisId);
                ${this.func.args.map((a,i)=>this.tr(a).cborPack("req",`arg_${i}`)).join("\n")}
                std::vector<uint8_t> res=${this.prefix}frontend->query(req);
                ${epilogue}
            }
        `);
    }
}