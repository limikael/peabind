#include "basic.h"

int hello(int a, int b) {
	return a+b;
}

int hello2() {
	return 222;
}

std::shared_ptr<Hello> globalHello;

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