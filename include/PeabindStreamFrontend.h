#include <peabind.h>
#include "StreamTransport.h"
#include "CborStream.h"
#include <cassert>
#include <functional>
#include <map>

class PeabindStreamFrontend;

class StreamFrontendProxy {
public:
    int instanceId;
    PeabindStreamFrontend *frontend;
};

struct InstanceIdTag {
    int instanceId;
};

class StreamFrontendListener {
public:
    StreamFrontendListener(std::function<void()> handler_) { handler=handler_; }
    void emit(std::vector<uint8_t> data) { handler(); }

private:
    std::function<void()> handler;
};

class PeabindStreamFrontend {
public:
    PeabindStreamFrontend(StreamTransport *streamTransport_);
    ~PeabindStreamFrontend();
    std::vector<uint8_t> query(std::vector<uint8_t> req);

    template<typename T>
    int pack(std::shared_ptr<T> instance) { return instance->instanceId; }

    template<typename T>
    std::shared_ptr<T> unpack(int instanceId) { return T::createInstanceProxy(instanceId); }

    int addEventListener(int instanceId, int eventId, std::function<void()> fn);
    void handleMessage(std::vector<uint8_t> msg);
    void handleEmit(std::vector<uint8_t> msg);
    void loop();

private:
    std::map<int,std::unique_ptr<StreamFrontendListener>> listeners;
    StreamTransport *streamTransport;
    CborStream *cborStream;
};

template<typename... Args>
class StreamFrontendDispatcher {
public:
    int on(std::function<void(Args...)> listener) {
        return frontendProxy->frontend->addEventListener(frontendProxy->instanceId,eventId,[listener](){
            listener();
        });
    }

    void off(int handle) {
    }

    void off() {
    }

    void setFrontendProxy(StreamFrontendProxy *p) { frontendProxy=p; }
    void setEventId(int eid) { eventId=eid; }

    StreamFrontendProxy *frontendProxy=nullptr;
    int eventId=0;
};
