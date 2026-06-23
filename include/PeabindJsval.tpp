extern JSVAL promiseClassId;

template<class T> 
std::shared_ptr<T> PeabindJsval::unpack(JSVAL v, JSVAL classId) { 
    return std::static_pointer_cast<T>(unpackInstance(v,classId)); 
}

template<class T>
JSVAL PeabindJsval::pack(std::shared_ptr<T> instance, JSVAL classId) {
    return packInstance(instance,classId);
}

template<typename T>
JSVAL PeabindJsval::packPromise(Promise<T> promise, std::function<JSVAL(T)> packer) {
    JSVAL promiseVal=jsvalCreateObject(promiseClassId);
    PromiseOpaque *promiseOpaque=new PromiseOpaque();
    jsvalSetOpaque(promiseVal,promiseOpaque);

    promiseOpaque->then=[promise, packer, this](JSVAL cb) mutable {
        if (promise.isSettled()) {
            if (promise.isResolved()) {
                JSVAL args[1];
                args[0]=packer(promise.getResult());
                JSVAL res=jsvalCall(cb,jsvalUndefined(),1,args);
                jsvalFree(res);
                jsvalFree(args[0]);
            }

            return;
        }

        Dispatcher<T> *thenDispatcher=promise.getThenDispatcher();
        JSVAL_REF cbRef=jsvalRefCreate(cb);
        int handle=thenDispatcher->on([cbRef, packer](T val) mutable {
            JSVAL args[1];
            args[0]=packer(val);
            JSVAL cbv=jsvalRefGetValue(cbRef);
            JSVAL res=jsvalCall(cbv,jsvalUndefined(),1,args);
            jsvalFree(res);
            jsvalFree(args[0]);
        });

        Listener *listener=new Listener((Dispatcher<>*) thenDispatcher,handle);
        listeners.push_back(listener);
        thenDispatcher->setDestructor(handle,[listener, cbRef, this](){
            removeListener(listener);
            jsvalRefFree(cbRef);
        });
    };

    promiseOpaque->onCatch=[promise, this](JSVAL cb) mutable {
        if (promise.isSettled()) {
            if (promise.isRejected()) {
                std::string reason=promise.getReason();
                JSVAL args[1];
                args[0]=jsvalCreateString(reason.c_str());
                JSVAL res=jsvalCall(cb,jsvalUndefined(),1,args);
                jsvalFree(res);
                jsvalFree(args[0]);
            }

            return;
        }

        Dispatcher<std::string> *catchDispatcher=promise.getCatchDispatcher();
        JSVAL_REF cbRef=jsvalRefCreate(cb);
        int handle=catchDispatcher->on([cbRef](std::string reason) mutable {
            JSVAL args[1];
            args[0]=jsvalCreateString(reason.c_str());
            JSVAL cbv=jsvalRefGetValue(cbRef);
            JSVAL res=jsvalCall(cbv,jsvalUndefined(),1,args);
            jsvalFree(res);
            jsvalFree(args[0]);
        });

        Listener *listener=new Listener((Dispatcher<>*) catchDispatcher,handle);
        listeners.push_back(listener);
        catchDispatcher->setDestructor(handle,[listener, cbRef, this](){
            removeListener(listener);
            jsvalRefFree(cbRef);
        });
    };

    return promiseVal;
}
