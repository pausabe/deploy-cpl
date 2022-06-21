#!/bin/sh
cd $1
git fetch
git checkout $2
git pull