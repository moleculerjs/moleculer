const { MetricRegistry } = require("../src/metrics");

const metrics = new MetricRegistry();

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
