rm -rf puzzles/output/*
make clean && make &&
make puzzle &&
make test_integration && 
make test_full &&
make clean && make TEXT=EJ_TEXT REGION=2 &&
make test_integration &&
make test_full &&
make test_ejus