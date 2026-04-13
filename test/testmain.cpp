#include <stdio.h>

void test_basic();
void test_events();
void test_types();
void test_event_types();
void test_strings();
void test_gc();

int main() {
	printf("Running tests...\n");

	test_basic();
	/*test_events();
	test_types();
	test_event_types();
	test_strings();*/
	test_gc();

	return 0;
}