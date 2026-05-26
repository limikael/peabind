#include "basic.h"

int liveHelloCount=0;

int mynamespace::hello3() {
	return 333;
}

int getLiveHelloCount() {
	return liveHelloCount;
}

int hello(int a, int b) {
	return a+b;
}

int hello2() {
	return 222;
}

std::string hellos(std::string s, std::string t) {
	return s+t;
}

std::shared_ptr<Hello> globalHello;

void removeHello() {
	globalHello=nullptr;
}

std::shared_ptr<Hello> createHello() {
	if (!globalHello) {
		//printf("creating the global hello...\n");

//		globalHello=std::make_shared<Hello>();
		globalHello=Hello::create();//std::make_shared<Hello>();
	}

	//printf("setting the global hello...\n");
	globalHello->setVal(666);

	return globalHello;
}

void setHelloVal(std::shared_ptr<Hello> hello, int val) {
	hello->setVal(val);
}

int getHelloVal(std::shared_ptr<Hello> hello) {
	return hello->getVal();
}

int hellof(float f) {
	return (f*10.0);
}

float hellothird(int i) {
	float f=((float)i)/3;
	return f;
}

std::vector<uint8_t> createBuffer() {
	std::vector<uint8_t> buffer = {11,22,33,44,55,66,77,88,99,00};
	return buffer;
}

int peekBuffer(std::vector<uint8_t> buffer, int i) {
	return buffer[i];
}

Promise<int> theIntPromise;
Promise<std::string> theStringPromise;
Promise<std::shared_ptr<Simple>> theSimplePromise;
Promise<> theVoidPromise;

Promise<int> getIntPromise() {
	return theIntPromise;
}

Promise<std::string> getStringPromise() {
	return theStringPromise;
}

Promise<std::shared_ptr<Simple>> getSimplePromise() {
	return theSimplePromise;
}

Promise<> getVoidPromise() {
	return theVoidPromise;
}
