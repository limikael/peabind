export async function loadWasmInstance({url, env}) {
	let wasmBytes;
	if (typeof window === 'undefined') {
	    let fs=await import('fs');
	    wasmBytes=await fs.promises.readFile(url);
	} else {
	    let res=await fetch(url);
	    wasmBytes=await res.arrayBuffer();
	}

	let memory;
	const imports = {
	    wasi_snapshot_preview1: {
	        proc_exit: (code) => {
	            throw new Error("WASM exited with code " + code);            
	        },        // called on program exit
	        fd_write: (fd, iovs, iovs_len, nwritten) => {
	            const mem = new DataView(memory.buffer);

	            let written = 0;

	            for (let i = 0; i < iovs_len; i++) {
	                const ptr = iovs + i * 8;
	                const buf = mem.getUint32(ptr, true);
	                const len = mem.getUint32(ptr + 4, true);
	                written += len;

	                // (optional) actually print:
	                const bytes = new Uint8Array(memory.buffer, buf, len);
	                console.log(new TextDecoder().decode(bytes));
	            }

	            mem.setUint32(nwritten, written, true);
	            return 0;
	        },
	        fd_close: () => 0,          // optional if you don’t use files
	        fd_seek: () => 0,           // optional
	        fd_fdstat_get: () => 0,     // optional
	        environ_sizes_get: () => 0, // optional
	        environ_get: () => 0,       // optional
	    },
	    env
	};

	let o=await WebAssembly.instantiate(wasmBytes, imports);
	let {instance}=o;
	let exp=instance.exports;
	memory=instance.exports.memory;

	return instance;
}