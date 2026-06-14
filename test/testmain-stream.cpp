#include <stdio.h>
#include "stream-backend.out.h"
#include "stream-frontend.out.h"
#include <deque>
#include <cassert>
#include "CborStream.h"
#include "basic.h"

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
	auto [a,b]=createMockStreamPair();
	auto backend=basic_create_stream_backend(b);
	b->dataEvent.on([backend](){
		backend->loop();
	});

	basic_init(a);

	int i=BasicFrontend::hello(1,2);
	assert(i==3);

	i=BasicFrontend::hello2();
	assert(i==222);

	i=BasicFrontend::hello3();
	assert(i==333);

	//BasicFrontend::Simple *s=new BasicFrontend::Simple(123);

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

	return 0;
}