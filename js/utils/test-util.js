export async function forceGc() {
	for (let i=0; i<10; i++) {
		gc();
		await new Promise(r=>setTimeout(r,10));
	}
}
