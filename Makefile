#	./ext/mquickjs-main/mqjs_stdlib > lab/js_stdlib.out.h
.PHONY: mqjslab test

mqjslab:
	gcc -o bin/mqjs_stdlib_lab \
		-Iext/mquickjs-main \
		ext/mquickjs-main/mquickjs_build.c \
		lab/mqjs_stdlib_lab.c
	./bin/mqjs_stdlib_lab -m64 > lab/js_stdlib.out.h
	gcc -o bin/mquickjslab \
		-Iext/mquickjs-main \
		lab/mquickjslab.c \
		ext/mquickjs-main/mquickjs.c \
		ext/mquickjs-main/dtoa.c \
		ext/mquickjs-main/cutils.c \
		ext/mquickjs-main/libm.c \
		-lm
	./bin/mquickjslab


# fix back to wrapcc
test:
	rm -f test/*.out.*
	gcc -o bin/mqjs_stdlib_test \
		-Iext/mquickjs-main \
		ext/mquickjs-main/mquickjs_build.c \
		test/mqjs_stdlib_test.c
	./bin/mqjs_stdlib_test -m64 > test/js_stdlib.out.h

	peabind -otest/basic.out.cpp \
		spec/basic/basic.json \
		-pbasic_ \
		-tquickjs
	gcc -o bin/testmain \
		-std=c++20 \
		test/*.cpp \
		test/test-*.c \
		ext/mquickjs-main/mquickjs.c \
		ext/mquickjs-main/dtoa.c \
		ext/mquickjs-main/cutils.c \
		ext/mquickjs-main/libm.c \
		spec/basic/basic.cpp \
		-Ispec/basic \
		-Iext/quickjs-2025-09-13 \
		-Iext/mquickjs-main \
		ext/quickjs-2025-09-13/libquickjs.a \
		$(shell peabind --lib-conf=cargs -tquickjs) -O0
	./bin/testmain
