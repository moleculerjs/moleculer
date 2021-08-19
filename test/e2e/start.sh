#!/bin/bash

for dir in scenarios/*/ ; do
    pushd $dir;
	./start.sh;
	popd;
done
