# Pixel Pup, e-Reader version

This is a nonogram (aka picross) game for the Game Boy Advance e-Reader, written in z-80 assembly.

![screenshot of gameplay](https://github.com/city41/ereader-pixel-pup/blob/main/playingPuzzleScreenshot.png?raw=true)
![screenshot of a solved puzzle](https://github.com/city41/ereader-pixel-pup/blob/main/puzzleSolvedScreenshot.png?raw=true)

This is the puzzle menu where you choose a puzzle to solve.

![screenshot of puzzle menu](https://github.com/city41/ereader-pixel-pup/blob/main/puzzleMenuScreenshot.png?raw=true)

Once solved, it shows the solution in the menu.

![screenshot of puzzle menu](https://github.com/city41/ereader-pixel-pup/blob/main/puzzleSolvedInMenuScreenshot.png?raw=true)

## Types of cards

Pixel Pup has a main card containing the game engine. That card is scanned into the e-reader first. Then once the game is loaded, it will ask you to scan another card in. Here you will scan a puzzle pack card in to load a set of puzzles to solve. Pixel Pup supports up to 256 puzzles.

Here is a video showing the whole process: https://www.youtube.com/watch?v=SzAA6F-amRI

## To build

Only tested on Ubuntu 22. It should "just work" on Ubuntu and other Linuxes

```bash
cd src
make clean && make puzzle && make sav
```

This will create `pixelpup.sav` which can be loaded into an emulator or flash card along with the ereader ROM. `make puzzle` will make puzzle cards in `../puzzles/output`. If using the repo as it comes, you should find `entomology.raw` in this directory.

## Running in mGBA

`make clean && make runsav` will build the game then immediately launch it in mGBA. This requires the ereader ROM and mgba to be where the Makefile expects them. Look for `EREADER_MGBA_ROM` and `MGBA` in the Makefile.

Once in the game, head to File > Scan e-Reader dot codes, and choose `entomology.raw`. Then press A in the game to scan that card in, and it will get scanned in.

### Even easier with runsavscan

`make clean && make puzzle && make runsavscan` is even simpler. This will launch mGBA with `entomology.raw` specified on the command line. So you just need to press A and it will scan the card in. No need to manually choose the card.

## Defining puzzles

The open source version of the game includes a single puzzle for testing/demo purposes, Grub.

You will find `puzzle.json` in the `puzzles/` directory, and inside it specifies Grub 15 times. That is because the game requires puzzle packs to have full rows for proper navigation. For space saving purposes, the game does not handle trailing rows that only have a few puzzles in them. In other words, this is fine in the puzzle menu:

```
O O O O O
O O O O O
O O O O O
```

But this is not

```
O O O O O
O O O O O
O O O
```

### Defining a mascot

Each puzzle pack has one mascot. For the demo puzzle pack, it is the dog Franny in a bee costume. The mascot is defined in `puzzle.json`. Here are the requirements:

- mascotBody: a 24x24px sprite
- mascotSadFace: an 8x8px sprite showing the mascot frowning. used whenever the player makes a mistake
- mascotTail: a two frame 8x8px sprite (thus the image is 16x8). This is two frames of animation that is typically a dog wagging its tail, but can be anything you want. It will always be displayed in the lower left of the body however.
- palette: a 15x1 png image with the mascot's palette. The mascot can at most have 15 colors, and all three sprites must share the same palette. This palette is also used for puzzles. See below.

See the existing mascot in the `puzzles/` directory.

### Defining Puzzles

Pixel Pup allows three puzzle sizes:

- 5x5
- 8x8
- 15x15

To define a puzzle, make a png file that contains the puzzle. The png file must be a multiple of 8px as it is also used as a sprite to show once the puzzle is solved.

- 5x5: an 8x8px png with the puzzle in the upper left.
- 8x8: an 8x8px png with the puzzle using up the entire image

To define a puzzle, make a png file that contains the puzzle. The png file must be a multiple of 8px as it is also used as a sprite to show once the puzzle is solved.

- 5x5: an 8x8px png with the puzzle in the upper left.
- 8x8: an 8x8px png with the puzzle populating the entire image.
- 15x15: a 16x16px png with the puzzle taking up all but the rightmost column and bottommost row.

When defining the puzzles, they must:

- be a legal nonogram puzzle.
- use the palette as defined in `"palette"` in the json entry. In this palette, the last 5 colors are "solid", and can be used to form the puzzle. The remaining 10 colors are "highlight", and are only used to give the puzzle more flavor and color once it is solved. See the existing Grub.png and palette.png.

To create legal nonograms, this tool is useful: https://nonogram.kniffen.dev/

Also, this page has more info on puzzle packs and how to define them: https://www.retrodotcards.com/pixel-pup/puzzle-pack-spec

### Puzzle pack callback function

Puzzle packs can optionally define a function that the game will call once the pack is loaded. This is used to give each puzzle pack a little something unique. The example puzzle pack in this repo adds a dangling spider in the upper right corner. This is done by adding an `"asm"` entry to the puzzle pack entry in puzzle.json, and writing the asm file. See `puzzles/entomology1.asm` for an example. Note that this file contains hardcoded directories on my own computer, as this was never intended to be used by anyone else :) You will need to adjust those paths accordingly.

### Generating the puzzles

Once you have puzzle.json and the corresponding pngs all set, run `make puzzle` to generate the puzzle pack raws. You need node and yarn installed for this.

#### Puzzle generation output

In `puzzles/output` will be several files generated:

- puzzlepack.raw - the file you care about, this is an ereader card ready to be loaded into mGBA, or converted into an image and printed.
- puzzlepack.asm - The puzzle pack binary in asz80 format. This was originally created to embed puzzles directly into the main card for easier development loops, but is now ignored.
- puzzlepack.bin - The raw assembled binary of your puzzlepack.
- puzzlepack.c and puzzlepack.h - The puzzle pack binary in a C char array for embedding into a C program. I originally tried writing Pixel Pup in C. This file is now ignored.
- puzzlepack.decoded.bin - the raw file decoded. This is used by the integration tests.
- puzzlepack.vpk - the puzzle pack binary compressed using Nintendo's vpk0 compression. This is what gets encoded into a raw.

## Building on other OSes

I have never tested this. But basically you will need to get the proper ereader tools, place them in `bin/`, and then update the Makefile accordingly.

A modern port of the tools can be found here: https://github.com/breadbored/nedclib

The original tools for Windows can be found here: https://caitsith2.com/ereader/devtools.htm

## The assembler

I wrote this using [asz80](https://shop-pdp.net/ashtml/asz80.htm) which is a very old, but pretty good, z80 assembler. It's main gotcha is it doesn't directly produce a binary. If you look in the Makefile, you will see asm->bin is several steps.

You can get asz80 binaries here: https://shop-pdp.net/ashtml/asxget.php

## Integration tests

Running `make test_integration` will run the integration test suite. Node and yarn are needed for this. The tests take a while to run, and if a test fails, it almost always means the test run will take a very long time to complete (it will eventually). These tests run the actual game in a z80 emulator and do a very good job of ensuring the game lacks bugs. Note that I originally wrote these tests before Pixel Pup was open sourced, so it assumed it had a full suite of puzzles to work with. Due to this, I have `skip`ed several tests in the suite.
