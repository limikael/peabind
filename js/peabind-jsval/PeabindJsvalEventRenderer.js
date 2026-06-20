import {ifdefWrap} from "../utils/lang-util.js";
import EventRenderer from "../idl/EventRenderer.js";

export default class PeabindJsvalEventRenderer extends EventRenderer {
    generateOnDef() {
    	let event=this.ev;
        let argDecl=event.args.map((a,i)=>this.tr(a).nativeParam(`a${i}`)).join(",");

        return `
            if (eventName=="${event.name}") {
                JSVAL_REF cbRef=jsvalRefCreate(cbVal);
                int handle=instance->${event.dispatcher}.on([cbRef](${argDecl}){
                    JSVAL params[${event.args.length}];
                    ${event.args.map((a,i)=>`
                        ${this.tr(a).pack(`params[${i}]`,`a${i}`)}
                    `).join("\n")}
                    //Serial.printf("will call handle\\n");
                    //printf("will call...\\n");
                    JSVAL res=jsvalCall(jsvalRefGetValue(cbRef),jsvalUndefined(),${event.args.length},params);
                    if (jsvalHasException()) {
                        //std::string s=jsvalCatchExceptionStdString();
                        //Serial.printf("ev err: %s\\n",s.c_str());
                    }
                    jsvalFree(res);

                    ${event.args.map((a,i)=>`
                        ${this.tr(a).cleanup(`params[${i}]`)}
                    `).join("\n")}

                    //Serial.printf("called\\n");
                });

                Dispatcher<>* d=(Dispatcher<>*)&(instance->${event.dispatcher});
                Listener *listener=new Listener(d,handle);
                listeners.push_back(listener);
                instance->${event.dispatcher}.setIdInt(handle,cbId);
                instance->${event.dispatcher}.setDestructor(handle,[cbRef,listener](){
                    removeListener(listener);
                    jsvalRefFree(cbRef);
                });
            }
        `
    }

    generateOffDef() {
    	let event=this.ev;

        return `
            if (eventName=="${event.name}") {
                int handle=instance->${event.dispatcher}.getHandleByIdInt(cbId);
                instance->${event.dispatcher}.off(handle);
            }
        `
    }
}
