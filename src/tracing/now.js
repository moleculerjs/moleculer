const loadTime = getNanoSeconds();
const nodeLoadTime = loadTime - process.uptime() * 1e9;

console.log("loadTime", loadTime);
console.log("nodeLoadTime", nodeLoadTime);

function getNanoSeconds() {
	const time = process.hrtime();
	return time[0] * 1e9 + time[1];
}

function now() {
	return (getNanoSeconds() - nodeLoadTime) / 1e6;
}

const loadNs = now();
const loadMs = Date.now();

console.log("loadNs", loadNs);
console.log("loadMs", loadMs);

module.exports = () => loadMs + now() - loadNs;
