puzzle_sprites_load:
    ;; get the puzzle count
    ld hl, scan_puzzle_buffer + PUZZLE_COLLECTION_PUZZLE_COUNT_OFFSET
    ld a, (hl)

    ld hl, scan_puzzle_buffer + PUZZLE_COLLECTION_PUZZLES_OFFSET
    ld (_ps_cur_puzzle_pointer), hl

    ;; loop counters
    ld b, a
    ld c, 0

    puzzle_sprites_load__loop:
    ;; save the loop counters
    ;; sets up _ps_sprite for the current puzzle
    push bc
    call _ps_load_puzzle_sprite
    pop bc


    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
puzzle_sprites_load__set_palette_index:
    ld  e, PALETTE_INDEX_PUZZLE_PACK
    ld  hl, _ps_sprite
    rst 0
    .db ERAPI_SpriteCreate


    ;; new sprite handle in hl, need to save it to the array
    ;; move it to de
    push hl
    pop de
    ;; load up the array
    ld hl, _ps_puzzle_sprite_handles
    ;; move forward into the array
    push bc
    ld b, 0
    ;; twice since handles are words
    add hl, bc
    add hl, bc
    ;; hl is now pointing at where we need to save
    ld (hl), e
    inc hl
    ld (hl), d
    ;; sprite handle now saved

    ;; restore loop counters
    pop bc
    ;; move to next sprite index
    inc c

    djnz puzzle_sprites_load__loop

    ret


;; give an index in c, returns the puzzle's sprite handle in hl
;;
;; returns:
;; hl - the puzzle sprite's handle
;; clobbers:
;; bc
puzzle_sprites_get:
    ld hl, _ps_puzzle_sprite_handles
    ld b, 0
    add hl, bc
    add hl, bc

    ld c, (hl)
    inc hl
    ld b, (hl)

    push bc
    pop hl

    ret

;; given a puzzle id in de, returns
;; that puzzle's sprite handle
puzzle_sprites_get_handle_by_id:
    ;; get the starting id
    ld hl, (scan_puzzle_buffer + PUZZLE_COLLECTION_PUZZLES_OFFSET)
    ;; move it to to bc
    push hl
    pop bc
    ;; move id into hl
    push de
    pop hl
    

;; clobbers: bc
_ps_load_puzzle_sprite:
    ld hl, (_ps_cur_puzzle_pointer)
    ;; get the puzzle's size
    ;; move past the id
    inc hl
    inc hl
    ld a, (hl)
    ;; is it a large puzzle?
    cp PUZZLE_SIZE_LARGE
    jr z, _ps_load_puzzle_sprite__large

    ;; this is a small or medium puzzle
    call _ps_copy_current_sprite_tiles
    ld hl, _ps_scale_sprite_buffer
    ld de, PUZZLE_SIZE_OF_SMALL_MEDIUM_PUZZLE
    ld a, 3

    jr _ps_load_puzzle_sprite__size_done

    _ps_load_puzzle_sprite__large:
    ld a, 2
    ld de, PUZZLE_SIZE_OF_LARGE_PUZZLE
    ;; load the tile pointer into the sprite
    ld bc, PUZZLE_TILE_DATA_OFFSET - 2
    ;; move hl forward to point at the tile data
    add hl, bc

    _ps_load_puzzle_sprite__size_done:

    ;; a is the size of the puzzle in sprite tiles
    ld (_ps_sprite_w), a
    ld (_ps_sprite_h), a
    ld (_ps_sprite), hl

    ;; now move onto the next puzzle
    ld hl, (_ps_cur_puzzle_pointer)
    add hl, de
    ld (_ps_cur_puzzle_pointer), hl

    ret

;; copies the tiles from the current puzzle 
;; (as determined by _ps_cur_puzzle_pointer)
;; into _ps_scale_sprite_buffer
_ps_copy_current_sprite_tiles:
    ld b, PUZZLE_SIZE_OF_SMALL_MEDIUM_TILE_DATA
    ;; index into the tile data with e
    ld d, 0
    ld e, 0

    _gw_copy_sprite_tiles__loop:
    ;; get to the tile data
    ld hl, (_ps_cur_puzzle_pointer)
    push de
    ld de, PUZZLE_TILE_DATA_OFFSET
    add hl, de
    pop de

    ;; now get to the current byte we are copying
    add hl, de

    ;; load up the byte
    ld a, (hl)

    ;; load a pointer to the output byte
    ;; + 128 because we are copying the data into the 5th tile
    ld hl, _ps_scale_sprite_buffer + 128
    add hl, de
    ;; copy the byte in
    ld (hl), a

    ;; move to next byte
    inc e
    djnz _gw_copy_sprite_tiles__loop

    ret

    .even
_ps_cur_puzzle_pointer:
    .dw 0

_ps_sprite:
    ; .dw 0  ; tiles
    .dw scan_puzzle_buffer + PUZZLE_COLLECTION_PUZZLES_OFFSET + PUZZLE_TILE_DATA_OFFSET
    .dw scan_puzzle_buffer + PUZZLE_COLLECTION_PALETTE_OFFSET ; palette
_ps_sprite_w:
    ;; purposely chose 1s as they will compress a smidge better
    .db 1          ; width
_ps_sprite_h:
    .db 1          ; height
    .db 1          ; frames
    .db 1          ; ?
    .db 1          ; hitbox width
    .db 1          ; hitbox height
    .db 1          ; total frames
_ps_puzzle_sprite_handles:
    .include '_ps_puzzle_sprite_handles.asm'
_ps_scale_sprite_buffer:
    .include '_ps_scale_sprite_buffer.asm'