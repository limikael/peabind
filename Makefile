#	./ext/mquickjs-main/mqjs_stdlib > lab/js_stdlib.out.h

.PHONY: test
testlib:
	gcc -o bin/mqjs_stdlib_lab \
		-Iext/mquickjs-main \
		ext/mquickjs-main/mquickjs_build.c \
		lab/mqjs_stdlib_lab.c
	./bin/mqjs_stdlib_lab -m64 > lab/js_stdlib.out.h


.PHONY: test
test: testlib
	gcc -o bin/mquickjslab \
		-Iext/mquickjs-main \
		lab/mquickjslab.c \
		ext/mquickjs-main/mquickjs.c \
		ext/mquickjs-main/dtoa.c \
		ext/mquickjs-main/cutils.c \
		ext/mquickjs-main/libm.c \
		-lm
	./bin/mquickjslab
