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