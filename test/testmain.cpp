#include <stdio.h>

void test_basic();
void test_events();
void test_types();
void test_event_types();

int main() {
	printf("Running tests...\n");

	test_basic();
	test_events();
	test_types();
	test_event_types();

	return 0;
}