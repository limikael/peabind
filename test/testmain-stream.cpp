#include <stdio.h>
#include "stream-backend.out.h"
#include "stream-frontend.out.h"
#include <deque>
#include <cassert>
#include "CborStream.h"
#include "basic.h"
#include <cmath>

using namespace CborLite;

class MockStreamTransport: public StreamTransport {
public:
	void loop() override {
	}

	virtual bool available() override {
		return buffer.size();
	}

	virtual int read() override {
		int res=buffer.front();
		buffer.pop_front();
		return res;
	}

	virtual void write(int value) override {
		other->handleIncoming(value);
	}

	void handleIncoming(int value) {
		buffer.push_back(value);
		dataEvent.emit();
	}

	std::deque<uint8_t> buffer;
	MockStreamTransport *other;
	Dispatcher<> dataEvent;
};

std::pair<MockStreamTransport *, MockStreamTransport *> createMockStreamPair() {
	auto a=new MockStreamTransport();
	auto b=new MockStreamTransport();
	a->other=b;
	b->other=a;

	return std::make_pair(a,b);
}

std::pair<CborStream *, CborStream *> createMockCborStreamPair() {
	auto p=createMockStreamPair();
	auto a=new CborStream(p.first), b=new CborStream(p.second);

	return std::make_pair(a,b);
}

void test_stream() {
	fprintf(stderr,"- Stream...\n");
	auto [a,b]=createMockStreamPair();
	int i;

	assert(!b->available());

	a->write(123);
	a->write(125);
	assert(b->available());
	i=b->read();
	assert(i==123);
	i=b->read();
	assert(i==125);
	assert(!b->available());

	delete a;
	delete b;
}

void test_cbor() {
	fprintf(stderr,"- Cbor stream...\n");
	auto [a,b]=createMockCborStreamPair();

    std::vector<unsigned char> outm;
    size_t size=5;
    encodeArraySize(outm,size);
    encodeInteger(outm,101);
    encodeInteger(outm,102);
    encodeInteger(outm,103);
    encodeInteger(outm,104);
    encodeInteger(outm,105);
	a->write(outm);

	outm.clear();
    encodeInteger(outm,42);
	a->write(outm);

	assert(b->available());
    std::vector<unsigned char> inm1=b->read();
    auto pos=inm1.begin();
    size_t items;
    decodeArraySize(pos,inm1.end(),items);
    assert(items==5);

	assert(b->available());
    std::vector<unsigned char> inm2=b->read();
    assert(inm2.size()==2);
	assert(!b->available());

	delete a->getTransport();
	delete b->getTransport();
	delete a;
	delete b;
}

void test_stream_basic() {
	fprintf(stderr,"- Stream calls...\n");
	auto [a,b]=createMockStreamPair();
	auto backend=basic_create_stream_backend(b);
	b->dataEvent.on([backend](){
		backend->loop();
	});

	basic_init(a);

	int i=BasicFrontend::hello(1,2);
	//printf("ret=%d\n",i);
	assert(i==3);

	i=BasicFrontend::hello2();
	assert(i==222);

	i=BasicFrontend::hello3();
	assert(i==333);

	BasicFrontend::Simple *s1=new BasicFrontend::Simple(123);
	BasicFrontend::Simple *s2=new BasicFrontend::Simple(456);

	assert(s1->getVal()==123);
	assert(s2->getVal()==456);

	assert(s1->instanceId==1);
	assert(s2->instanceId==2);

	assert(backend->getNumLiveInstances()==2);
	delete s1;
	assert(backend->getNumLiveInstances()==1);
	delete s2;
	assert(backend->getNumLiveInstances()==0);

	BasicFrontend::Hello *h=new BasicFrontend::Hello(123);
	assert(h->getVal()==123);
	h->setVal(777);
	assert(h->getVal()==777);

	delete h;

	assert(BasicFrontend::hellof(.5)==5);
	assert(BasicFrontend::hellos("hello","world")=="helloworld");

	//printf("third: %f\n",BasicFrontend::hellothird(10));
	assert(fabs(BasicFrontend::hellothird(10)-3.3333333)<0.000001);

	std::vector<uint8_t> buf=BasicFrontend::createBuffer();
	assert(BasicFrontend::peekBuffer(buf,2)==33);

	{
		assert(BasicFrontend::getLiveHelloCount()==0);

		auto hell=BasicFrontend::createHello();
		assert(hell->getVal()==666);

		BasicFrontend::setHelloVal(hell,987);
		assert(hell->getVal()==987);

		assert(BasicFrontend::getHelloVal(hell)==987);

		assert(BasicFrontend::getLiveHelloCount()==1);
	}

	BasicFrontend::removeHello();
	assert(BasicFrontend::getLiveHelloCount()==0);

	basic_exit();
	delete backend;
	delete a;
	delete b;
}

void test_stream_events() {
	fprintf(stderr,"- Stream events...\n");
	auto [a,b]=createMockStreamPair();
	auto backend=basic_create_stream_backend(b);
	b->dataEvent.on([backend](){
		backend->loop();
	});

	basic_init(a);
	int handlerId;
	auto s=std::make_shared<BasicFrontend::Simple>(123);
	bool called=false;
	handlerId=s->dataEvent.on([&called](){
		called=true;
		//printf("event called...");
	});
	s->emitData();
	assert(called);

	s=nullptr;

	//printf("handlerId: %d\n",handlerId);

	basic_exit();
	delete backend;
	delete a;
	delete b;
}

int main() {
	fprintf(stderr,"Running stream tests...\n");

	test_stream();
	test_cbor();
	test_stream_basic();
	test_stream_events();

	return 0;
}