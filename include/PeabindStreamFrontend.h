#include <peabind.h>
#include "StreamTransport.h"
#include "CborStream.h"

struct InstanceIdTag {
    int instanceId;
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

private:
    StreamTransport *streamTransport;
    CborStream *cborStream;
};
