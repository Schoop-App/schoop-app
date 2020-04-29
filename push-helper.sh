#!/bin/bash
# Trust me, I know this is a silly tool.
# It just makes my life a heck of a lot
# easier. Fifteen minutes could save you
# fifteen percent or more on car insurance.
cd web-app
./setJsLastRevised
git add . && git add -u
git commit -m "$1"
git push -u origin master
