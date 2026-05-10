#	./ext/mquickjs-main/mqjs_stdlib > lab/js_stdlib.out.h
.PHONY: mqjslab test-quickjs test-mquickjs test

test: test-quickjs test-mquickjs

test-mquickjs:
	rm -f test/*.out.*
	peabind -otest/basic.out.cpp \
		spec/basic/basic.json \
		-pbasic_ \
		-tmqjs
	wrapcc --linker=g++ gcc -g -o bin/testmain-mquickjs \
		-Wno-narrowing \
		-Iinclude \
		-Iext/mquickjs-main \
		-Ispec/basic \
		-lm \
		spec/basic/basic.cpp \
		test/basic.out.cpp \
		test/test-mqjs-basic.cpp \
		test/test-jsval-mquickjs.cpp \
		test/testmain-mquickjs.cpp \
		ext/mquickjs-main/mquickjs.c \
		ext/mquickjs-main/dtoa.c \
		ext/mquickjs-main/cutils.c \
		ext/mquickjs-main/libm.c \
		$(shell peabind --lib-conf=cargs -tmqjs) -O0
	valgrind --quiet \
		--leak-check=full \
		--show-leak-kinds=all \
		--error-exitcode=1 \
		--errors-for-leak-kinds=all \
		./bin/testmain-mquickjs

test-quickjs:
	rm -f test/*.out.*

	peabind -otest/basic.out.cpp \
		spec/basic/basic.json \
		-pbasic_ \
		-tquickjs
	wrapcc g++ -g -o bin/testmain-quickjs \
		-DFULLTEST \
		-std=c++20 \
		-Ispec/basic \
		-Iext/quickjs-2025-09-13 \
		spec/basic/basic.cpp \
		test/basic.out.cpp \
		test/test-basic.cpp \
		test/test-jsval-quickjs.cpp \
		test/testmain-quickjs.cpp \
		ext/quickjs-2025-09-13/libquickjs.a \
		$(shell peabind --lib-conf=cargs -tquickjs) -O0
	./bin/testmain-quickjs

#	valgrind --quiet \
		--leak-check=full \
		--show-leak-kinds=all \
		--error-exitcode=1 \
		--errors-for-leak-kinds=all \
