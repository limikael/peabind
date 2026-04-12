#pragma once
#include <cstdio>
#include "peabind.h"

class Mini {
public:
	Mini() {
		printf("creating mini\n");
	}

	~Mini() {
		printf("destroying mini\n");
	}
};
