#include "basic.h"

int liveHelloCount=0;

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

int hellof(float f) {
	return (f*10.0);
}

float hellothird(int i) {
	float f=((float)i)/3;
	return f;
}
