#include <stdio.h>
#include <string.h>
#include <stdlib.h>

//extern "C" {
#include <mquickjs.h>
#include "js_stdlib.out.h"
//#include "example_stdlib.h"
//#include "mqjs_stdlib.h"
//}

#define MEMSIZE 65536

int main() {
    void *mem; //, *buf;
	JSContext *ctx;
    JSCStringBuf b;

    mem=malloc(MEMSIZE);
    ctx=JS_NewContext(mem, MEMSIZE, &js_stdlib);

    printf("context created...\n");

    const char *s="100";
    JSValue val=JS_Eval(ctx,s,strlen(s),"<inline>",JS_EVAL_RETVAL);
	const char *t=JS_ToCString(ctx,val,&b);

    printf("res: %s\n",t);

    JS_FreeContext(ctx);
    free(mem);

	printf("done...\n");
}

/*
    size_t mem_size;
    int buf_len;
    uint8_t *mem_buf, *buf;
    JSContext *ctx;
    const char *filename;
    JSValue val;
    
    if (argc < 2) {
        printf("usage: example script.js\n");
        exit(1);
    }

    filename = argv[1];

    mem_size = 65536;
    mem_buf = malloc(mem_size);
    ctx = JS_NewContext(mem_buf, mem_size, &js_stdlib);
    JS_SetLogFunc(ctx, js_log_func);
    
    buf = load_file(filename, &buf_len);
    val = JS_Eval(ctx, (const char *)buf, buf_len, filename, 0);
    free(buf);
    if (JS_IsException(val)) {
        JSValue obj;
        obj = JS_GetException(ctx);
        JS_PrintValueF(ctx, obj, JS_DUMP_LONG);
        printf("\n");
        exit(1);
    }
    
    JS_FreeContext(ctx);
    free(mem_buf);
    return 0;

*/
