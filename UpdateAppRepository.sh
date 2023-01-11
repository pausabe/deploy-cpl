#!/bin/sh
cd $1
git fetch
git checkout $2
git pull
rm -rf node_modules
npm cache clean --force
npm install