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

## Inspecting & Profiling in Chrome

`node --inspect --expose-gc benchmark/perf-runner.js`

## IR Hydra

http://mrale.ph/irhydra/2/

```
$ node --trace-hydrogen --trace-phase=Z --trace-deopt --code-comments --hydrogen-track-positions --redirect-code-traces --redirect-code-traces-to=code.asm index.js
```
## JSON parse/stringify

https://github.com/douglascrockford/JSON-js


## Flame graph

http://www.brendangregg.com/blog/2014-09-17/node-flame-graphs-on-linux.html
https://www.slideshare.net/brendangregg/blazing-performance-with-flame-graphs

For Windows: https://github.com/google/UIforETW/releases

## Others

http://mrale.ph/blog/2011/12/18/v8-optimization-checklist.html 

http://stackoverflow.com/a/31549736/129346

https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#52-the-object-being-iterated-is-not-a-simple-enumerable

https://jsperf.com/let-compound-assignment

https://gist.github.com/trevnorris/f0907b010c9d5e24ea97

## Memory leak 

https://www.youtube.com/watch?v=taADm6ndvVo&list=PLz6xH_GrBpquZgdVzEX4Bix0oxHQlZfwm&index=8

