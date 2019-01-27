const { MetricRegistry } = require("../src/metrics");
const _ = require("lodash");

const metrics = new MetricRegistry();
/*
console.log("--- COUNTER ---");

metrics.register({ type: "counter", name: "count", labelNames: ["a"] });

metrics.incValue("count");
console.log(metrics.getValue("count"));

metrics.incValue("count", null, 3);
console.log(metrics.getValue("count"));

console.log(metrics.getValue("count", { a: 5 }));
metrics.incValue("count", { a: 5 });
console.log(metrics.getValue("count", { a: 5 }));
console.log(metrics.getValue("count"));
metrics.resetMetric("count");
console.log(metrics.getValue("count", { a: 5 }));
console.log(metrics.getValue("count"));

console.log("--- GAUGE ---");

metrics.register({ type: "gauge", name: "gaug" });

metrics.incValue("gaug");
console.log(metrics.getValue("gaug"));

metrics.decValue("gaug", null, 3);
console.log(metrics.getValue("gaug"));

metrics.incValue("gaug");
console.log(metrics.getValue("gaug"));

metrics.setValue("gaug", 5);
console.log(metrics.getValue("gaug"));

metrics.resetValue("gaug");
console.log(metrics.getValue("gaug"));
*/

const latency = metrics.register({
	type: "histogram",
	name: "latency",
	quantiles: true,
	buckets: [1, 10, 25, 50, 90, 100]
});

/*for(let i = 0; i < 1000; i++) {
	latency.observe(30 + Math.floor(120 * Math.sin(i * 0.1))/10);
}*/

let max = 50;

setInterval(()=> {
	latency.observe(_.random(1, max));
}, 10);

setInterval(() => {
	console.log(latency.toString());
}, 1000);

setInterval(() => {
	max = _.random(30, 99);
}, 30 * 1000);
