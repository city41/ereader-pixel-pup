#!/bin/bash -x

rm -rf ~/tmp/raws
mkdir ~/tmp/raws

pushd src/exoAttack
# exo US
make clean && make REGION=1 TEXT=US_TEXT raws
cp ./*.raw ~/tmp/raws

# exo EJ
make clean && make REGION=2 TEXT=EJ_TEXT raws
cp ./*.raw ~/tmp/raws

# exo JP
make clean && make REGION=2 TEXT=JP_TEXT raws
cp ./*.raw ~/tmp/raws
popd

pushd src/frannyAnswers
# franny US
make clean && make REGION=1 TEXT=US_TEXT raws
cp ./*.raw ~/tmp/raws

# franny EJ
make clean && make REGION=2 TEXT=EJ_TEXT raws
cp ./*.raw ~/tmp/raws
popd

pushd src/bombHunter
# bomb US
make clean && make REGION=1 raws
cp ./*.raw ~/tmp/raws

# bomb EJ
make clean && make REGION=2 raws
cp ./*.raw ~/tmp/raws

# bomb JP
make clean && make REGION=2 raws
cp ./*.raw ~/tmp/raws
popd

pushd src/solitaire
# solitaire US
make clean && make REGION=1 raws
cp ./*.raw ~/tmp/raws

# solitaire EJ
make clean && make REGION=2 raws
cp ./*.raw ~/tmp/raws

# solitaire JP
make clean && make REGION=2 raws
cp ./*.raw ~/tmp/raws
popd

pushd src/scavengerHuntSeriesOne
# scavengerHuntSeriesOne US
make clean && make REGION=1 TEXT=US_TEXT raws
cp ./*.raw ~/tmp/raws

# scavengerHuntSeriesOne EJ
make clean && make REGION=2 TEXT=EJ_TEXT raws
cp ./*.raw ~/tmp/raws

# scavengerHuntSeriesOne JP
make clean && make REGION=2 TEXT=JP_TEXT raws
cp ./*.raw ~/tmp/raws
popd

pushd src/esnake
# esnake US
make clean && make REGION=1 TEXT=US_TEXT raws
cp ./*.raw ~/tmp/raws

# esnake EJ
make clean && make REGION=2 TEXT=EJ_TEXT raws
cp ./*.raw ~/tmp/raws

# esnake JP
make clean && make REGION=2 TEXT=JP_TEXT raws
cp ./*.raw ~/tmp/raws
popd

