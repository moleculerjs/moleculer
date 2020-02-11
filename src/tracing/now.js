const loadTime = getNanoSeconds();
const nodeLoadTime = loadTime - process.uptime() * 1e9;

function getNanoSeconds() {
	const time = process.hrtime();
	return time[0] * 1e9 + time[1];
}

function now() {
	return (getNanoSeconds() - nodeLoadTime) / 1e6;
}

const loadNs = now();
const loadMs = Date.now();

module.exports = () => loadMs + now() - loadNs;
