#!/bin/sh
cd $1
git reset --hard HEAD
git clean -fd
git fetch
git checkout $2
git pull