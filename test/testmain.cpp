#include <stdio.h>

void test_basic();
void test_events();

int main() {
	printf("Running tests...\n");

	test_basic();
	test_events();

	return 0;
}