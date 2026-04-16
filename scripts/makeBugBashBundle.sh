#!/bin/bash -x

rm -rf ~/tmp/bugbash
mkdir ~/tmp/bugbash

pushd src/exoAttack
# exo US
mkdir ~/tmp/bugbash/exoAttackUS
make clean && make REGION=1 TEXT=US_TEXT sav
cp ~/roms/gba/ereaderUSA.gba ~/tmp/bugbash/exoAttackUS/exoUS.gba
cp ./exoAttack.sav ~/tmp/bugbash/exoAttackUS/exoUS.fla

# exo EJ
mkdir ~/tmp/bugbash/exoAttackEJ
make clean && make REGION=2 TEXT=EJ_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/exoAttackEJ/exoEJ.gba
cp ./exoAttack.sav ~/tmp/bugbash/exoAttackEJ/exoEJ.fla

# exo JP
mkdir ~/tmp/bugbash/exoAttackJP
make clean && make REGION=2 TEXT=JP_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/exoAttackJP/exoJP.gba
cp ./exoAttack.sav ~/tmp/bugbash/exoAttackJP/exoJP.fla
popd

pushd src/frannyAnswers
# franny US
mkdir ~/tmp/bugbash/frannyUS
make clean && make REGION=1 TEXT=US_TEXT sav
cp ~/roms/gba/ereaderUSA.gba ~/tmp/bugbash/frannyUS/frannyUS.gba
cp ./frannyAnswers.sav ~/tmp/bugbash/frannyUS/frannyUS.fla

# franny EJ
mkdir ~/tmp/bugbash/frannyEJ
make clean && make REGION=2 TEXT=EJ_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/frannyEJ/frannyEJ.gba
cp ./frannyAnswers.sav ~/tmp/bugbash/frannyEJ/frannyEJ.fla
popd

pushd src/bombHunter
# bomb US
mkdir ~/tmp/bugbash/bombUS
make clean && make REGION=1 TEXT=US_TEXT sav
cp ~/roms/gba/ereaderUSA.gba ~/tmp/bugbash/bombUS/bombUS.gba
cp ./bombHunter.sav ~/tmp/bugbash/bombUS/bombUS.fla

# bomb EJ
mkdir ~/tmp/bugbash/bombEJ
make clean && make REGION=2 TEXT=EJ_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/bombEJ/bombEJ.gba
cp ./bombHunter.sav ~/tmp/bugbash/bombEJ/bombEJ.fla

# bomb JP
mkdir ~/tmp/bugbash/bombJP
make clean && make REGION=2 TEXT=JP_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/bombJP/bombJP.gba
cp ./bombHunter.sav ~/tmp/bugbash/bombJP/bombJP.fla
popd

pushd src/solitaire
# solitaire US
mkdir ~/tmp/bugbash/solitaireUS
make clean && make REGION=1 TEXT=US_TEXT sav
cp ~/roms/gba/ereaderUSA.gba ~/tmp/bugbash/solitaireUS/solUS.gba
cp ./solitaire.sav ~/tmp/bugbash/solitaireUS/solUS.fla

# solitaire EJ
mkdir ~/tmp/bugbash/solitaireEJ
make clean && make REGION=2 TEXT=EJ_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/solitaireEJ/solEJ.gba
cp ./solitaire.sav ~/tmp/bugbash/solitaireEJ/solEJ.fla

# solitaire JP
mkdir ~/tmp/bugbash/solitaireJP
make clean && make REGION=2 TEXT=JP_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/solitaireJP/solJP.gba
cp ./solitaire.sav ~/tmp/bugbash/solitaireJP/soLJP.fla
popd

pushd src/scavengerHuntSeriesOne
# scavengerHuntSeriesOne US
mkdir ~/tmp/bugbash/scavengerHuntSeriesOneUS
make clean && make REGION=1 TEXT=US_TEXT sav
cp ~/roms/gba/ereaderUSA.gba ~/tmp/bugbash/scavengerHuntSeriesOneUS/scavUS.gba
cp ./scavengerHuntSeriesOne.sav ~/tmp/bugbash/scavengerHuntSeriesOneUS/scavUS.fla

# scavengerHuntSeriesOne EJ
mkdir ~/tmp/bugbash/scavengerHuntSeriesOneEJ
make clean && make REGION=2 TEXT=EJ_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/scavengerHuntSeriesOneEJ/scavEJ.gba
cp ./scavengerHuntSeriesOne.sav ~/tmp/bugbash/scavengerHuntSeriesOneEJ/scavEJ.fla

# scavengerHuntSeriesOne JP
mkdir ~/tmp/bugbash/scavengerHuntSeriesOneJP
make clean && make REGION=2 TEXT=JP_TEXT sav
cp ~/roms/gba/ereaderJPN.gba ~/tmp/bugbash/scavengerHuntSeriesOneJP/scavJP.gba
cp ./scavengerHuntSeriesOne.sav ~/tmp/bugbash/scavengerHuntSeriesOneJP/scavJP.fla
popd

