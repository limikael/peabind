#include <peabind.h>
#include "StreamTransport.h"
#include "CborStream.h"
#include <map>

class PeabindStreamBackend;

typedef std::vector<uint8_t> PeabindStreamBackendFunction(PeabindStreamBackend*, std::vector<uint8_t>);

class PeabindStreamBackend {
public:
    PeabindStreamBackend(StreamTransport *streamTransport_);
    ~PeabindStreamBackend();
    void addFunction(int id, PeabindStreamBackendFunction *f);
    void addClass(int id, PeabindStreamBackendFunction *f);
    int addInstance(std::shared_ptr<void> instance);
    std::shared_ptr<void> getInstance(int instanceId);
    void loop();
    std::vector<uint8_t> handleCall(std::vector<uint8_t> req);
    std::vector<uint8_t> handleNew(std::vector<uint8_t> req);
    std::vector<uint8_t> handleDelete(std::vector<uint8_t> req);
    int getNumLiveInstances() { return instances.size(); }

    template<typename T>
    int pack(std::shared_ptr<T> instance) { return addInstance(instance); }

    template<typename T>
    std::shared_ptr<T> unpack(int instanceId) { return std::static_pointer_cast<T>(getInstance(instanceId)); }

private:
    int nextInstanceId=1;
    std::map<int,PeabindStreamBackendFunction*> functions;
    std::map<int,PeabindStreamBackendFunction*> constructors;
    std::map<int,std::shared_ptr<void>> instances;
    StreamTransport *streamTransport;
    CborStream *cborStream;
};
