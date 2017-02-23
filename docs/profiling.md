# Profiling in NodeJS

1. Run app in profiler mode
	```
	$ node --prof main.js
	```

2. Convert isolate file to text
	```
	$ node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt
	```

[More info](https://nodejs.org/en/docs/guides/simple-profiling/)

## Print optimizing

```
$ node --trace-opt index.js > trace.txt
```

With de-optimizing
```
$ node --trace-opt --trace-deopt index.js > trace.txt
```

More info: https://community.risingstack.com/how-to-find-node-js-performance-optimization-killers/
