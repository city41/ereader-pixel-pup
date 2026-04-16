#!/bin/bash -x

rm -rf ~/tmp/raws
mkdir ~/tmp/raws

pushd src/nonogram
# nono US
make clean && make REGION=1 TEXT=US_TEXT raws
cp ./*.raw ~/tmp/raws

# nono EJ
make clean && make REGION=2 TEXT=EJ_TEXT raws
cp ./*.raw ~/tmp/raws

make puzzle
cp ./puzzles/output/*.raw ~/tmp/raws

popd

for f in ~/tmp/raws/*.raw; do
    ./bin/raw2bmp -i $f -o $f.300 -dpi 300
done
