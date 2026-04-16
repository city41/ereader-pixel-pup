P_UPPER_NIBBLE_MASK = 0xf0
P_LOWER_NIBBLE_MASK = 0x0f
;;
;; parameters
;; d: x
;; e: y
;;
;; returns
;; a: 0 if it is an empty/highlight cell, 1 otherwise
;; clobbers
;; bc, hl, a
puzzle_cell_manager_get_cell:
    ;; save a copy of x/y into bc
    push de
    pop bc

    ;; get to the correct tile index

    ;; xTileIndex = x / 8
    ld h, 0
    ld l, d
    ld de, 8
    rst 8
    .db ERAPI_Div

    ;; push xTileIndex to stack
    push hl

    ;; restore x/y
    push bc
    pop de
    ;; yTileIndex = y / 8
    ld h, 0
    ld l, e
    ld de, 8
    rst 8
    .db ERAPI_Div
    ;; yTileIndex now in hl

    ;; tileIndex = yTileIndex * 2 + xTileIndex
    add hl, hl ;; hl * 2, yTileIndex*2
    ;; restore xTileIndex
    pop de

    ;; hl is now tileIndex
    add hl, de
    ;; multiply it by 32 to get the tile's starting byte index
    ld de, 32
    rst 8
    .db ERAPI_Mul16
    ;; hl is now the starting tile byte index
    ;; save starting byte tile index to stack
    push hl

    ;; restore x and y
    push bc
    pop de


    ;; now we need the within tile byte index

    ;; get within tile y index
    ld h, 0
    ld l, e
    ld de, 8
    rst 8
    .db ERAPI_Mod
    ;; hl is now y's within tile index
    ;; multiply it by 4 as a first step towards the within byte index
    ld de, 4
    rst 8
    .db ERAPI_Mul16
    ;; save y*4 within tile index to stack
    push hl

    ;; get within tile x index
    ;; restore xy
    push bc
    pop de
    ld h, 0
    ld l, d
    ld de, 8
    rst 8
    .db ERAPI_Mod
    ;; hl is now the within tile x index
    ;; divide it by two since each nibble holds a value
    ld de, 2
    rst 8
    .db ERAPI_Div
    ;; restore y*4 index
    pop de
    add hl, de
    ;; hl is now the within tile byte index
    
    ;; now add starting byte index and the within byte tile index
    ;; pop starting byte index off the stack
    pop de
    ;; and add it to the within byte index
    add hl, de


    ld de, PUZZLE_TILE_DATA_OFFSET
    ;; move hl to the tile data
    add hl, de

    ;; move the byte index
    push hl
    pop de

    ;; grab the starting pointer
    ld hl, (chosen_puzzle)
    ;; add on the byte index
    add hl, de
    ;; hl is finally pointed at the value

    ;; restore x/y
    push bc
    pop de

    ;; is x odd? if so, need the lower nibble, else higher
    ld a, d
    and 1
    ;; now grab the tile byte value
    ld a, (hl)
    jr z, puzzle_cell_manager_get_cell__lower_nibble
    ;; ok need the upper nibble
    and P_UPPER_NIBBLE_MASK
    cp GLOBAL_PALETTE_MAX_HIGHLIGHT_INDEX_UPPER_NIBBLE
    jr c, puzzle_cell_manager_get_cell__highlight_cell
    jr puzzle_cell_manager_get_cell__solid_cell

    puzzle_cell_manager_get_cell__lower_nibble:
    and P_LOWER_NIBBLE_MASK
    cp GLOBAL_PALETTE_MAX_HIGHLIGHT_INDEX_LOWER_NIBBLE
    jr c, puzzle_cell_manager_get_cell__highlight_cell

    puzzle_cell_manager_get_cell__solid_cell:
    ld a, 1
    ret

    puzzle_cell_manager_get_cell__highlight_cell:
    ld a, 0
    ret


