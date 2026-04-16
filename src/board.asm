BOARD_TILE_SIZE_PX = 6

BOARD_GRID_MAX_SIZE_PX = 96
BOARD_GRID_MAX_SIZE_TILES = BOARD_GRID_MAX_SIZE_PX/8
BOARD_GRID_X_TILES = 16
BOARD_GRID_Y_TILES = 7
B_GRID_START_UPPER_LEFT = 2

B_REGULAR_LINE_COLOR = GLOBAL_PALETTE_WHITE
B_BOUNDARY_LINE_COLOR = GLOBAL_PALETTE_MED_BLUE
B_FILLED_TILE_COLOR = GLOBAL_PALETTE_BLACK
B_XED_TILE_COLOR = GLOBAL_PALETTE_BLACK
B_CLEAR_TILE_COLOR = GLOBAL_PALETTE_LIGHT_GREY

B_TILE_CLEAR = 0
B_TILE_FILLED = 1
B_TILE_XED = 2

board_init:
    ; ERAPI_CreateRegion()
    ; h = bg# (0-3)
    ; l = palette bank (0-15)
    ; d = left in tiles
    ; e = top in tiles
    ; b = width in tiles
    ; c = height in tiles
    ld b, BOARD_GRID_MAX_SIZE_TILES
    ld c, BOARD_GRID_MAX_SIZE_TILES
    ld d, BOARD_GRID_X_TILES
    ld e, BOARD_GRID_Y_TILES
    ld h, BG_INDEX_BOARD
    ld l, PALETTE_INDEX_GLOBAL
    rst 0
    .db ERAPI_CreateRegion
    ld  (_b_handle_region), a
    ret

board_on_stop:
    ld a, (_b_handle_region)

    ld e, GLOBAL_PALETTE_TRANS
    rst 0
    .db ERAPI_SetRegionColor

    rst 0
    .db ERAPI_ClearRegion
    ret

board_clear_xes:
    ld a, (_b_cur_size_tile)
    ld b, a
    ld c, 0

    board_clear_xes__outer_loop:
    push bc

    ;; do one row
    ld a, (_b_cur_size_tile)
    ld b, a
    ;; reset x counter
    ld d, 0
    board_clear_xes__inner_loop:
    push de
    push bc
    ld a, c
    ld (cursor_board_y), a
    ld a, d
    ld (cursor_board_x), a

    call _b_get_tile
    cp B_TILE_XED
    jr nz, board_clear_xes__not_x
    ;; this is an xed tile
    ld a, B_TILE_CLEAR
    call _b_set_tile

    board_clear_xes__not_x:
    call _b_render_tile

    ;; move to next x
    pop bc
    pop de
    inc d
    djnz board_clear_xes__inner_loop

    ld a, 2
    halt

    ;; move to next y
    pop bc
    inc c
    djnz board_clear_xes__outer_loop

    ret

board_clear_boundary_lines:
    ;; small puzzles dont have boundary lines
    ld a, (_b_cur_size_tile)
    cp 5
    ret z

    ;; how big is the puzzle? medium and large
    ;; have different boundary lines
    ld a, (_b_cur_size_tile)
    cp 8
    ;; this is a medium puzzle, go draw it
    jr z, board_clear_boundary_lines__medium

    ;; this is large puzzle, four boundary lines
    ld e, B_REGULAR_LINE_COLOR
    ld c, 4
    call board_draw_horizontal_line_at
    ld e, B_REGULAR_LINE_COLOR
    ld c, 9
    call board_draw_horizontal_line_at

    ld e, B_REGULAR_LINE_COLOR
    ld c, 4
    call board_draw_vertical_line_at
    ld e, B_REGULAR_LINE_COLOR
    ld c, 9
    call board_draw_vertical_line_at
    ret

    board_clear_boundary_lines__medium:
    ;; this is medium puzzle, two boundary lines
    ld e, B_REGULAR_LINE_COLOR
    ld c, 3
    call board_draw_horizontal_line_at

    ld e, B_REGULAR_LINE_COLOR
    ld c, 3
    call board_draw_vertical_line_at
    ret

board_do_hint:
    ;; this hint will cause cursor to move
    ;; so update last accordingly
    ld a, (cursor_board_x)
    ld (cursor_board_last_x), a
    ld a, (cursor_board_y)
    ld (cursor_board_last_y), a

    board_hint__try_again:
    ;; first choose a random x/y
    ld a, (_b_cur_size_tile)
    rst 8
    .db ERAPI_RandMax

    ld (cursor_board_x), a

    ld a, (_b_cur_size_tile)
    rst 8
    .db ERAPI_RandMax

    ld (cursor_board_y), a

    ;; is it part of the puzzle?
    call _b_is_valid_fill
    cp 1
    ;; no? go try again
    jr nz, board_hint__try_again

    ;; ok, it is part of the puzzle, is it currently not filled?
    call _b_get_tile
    cp B_TILE_FILLED
    ;; yup, this is already filled, try again
    jr z, board_hint__try_again

    ;; this tile is not filled, it is our hint!
    ld a, B_TILE_FILLED
    call _b_set_tile
    call _b_render_tile

    ;; need to increase fill count
    ld a, (_b_cur_filled_count)
    inc a
    ld (_b_cur_filled_count), a

    ;; we are purposely leaving cursor x/y at the hint
    ;; to help the user realize where the hint occured
    ret

board_check_win:
    ld a, (_b_total_filled_count_to_win)
    ld b, a
    ld a, (_b_cur_filled_count)
    cp b
    jr z, board_check_win__won
    ld a, 0
    ret

    board_check_win__won:
    ld a, 1
    ret

_b_reset:
    ld hl, _b_filled_tiles
    ld b, 15*15
    ld a, 0
    _b_reset_filed_tiles__loop:
    ld (hl), a
    inc hl
    djnz _b_reset_filed_tiles__loop

    ld a, 0
    ld (_b_cur_filled_count), a
    ld (_b_last_tile_value), a
    ret

    .even
_b_size_enum_to_tile_size:
    .db PUZZLE_SMALL_TILE_COUNT
    .db PUZZLE_MEDIUM_TILE_COUNT
    .db PUZZLE_LARGE_TILE_COUNT
    

board_load_puzzle:
    ld hl, (chosen_puzzle)
    ;; left, top = (BOARD_GRID_MAX_SIZE_PX - (puzzleSize * TILE_SIZE)) / 2
    ;; save puzzle struct pointer
    push hl
    ;; move past the id
    inc hl
    inc hl
    ld a, (hl) ;; load size enum into a

    ;; translate from enum to actual tile size
    push hl
    ld hl, _b_size_enum_to_tile_size
    ld d, 0
    ld e, a
    add hl, de
    ld a, (hl)
    ld (_b_cur_size_tile), a
    pop hl

    inc hl
    ld a, (hl) ;; load number needed to win
    ;; save it off
    ld (_b_total_filled_count_to_win), a
    ld a, (_b_cur_size_tile)
    ld e, BOARD_TILE_SIZE_PX
    ;; hl=a*e -> board size in pixels
    rst 8
    .db ERAPI_Mul8
    ;; hl now has the puzzle size, save it off
    ld a, l
    ld (_b_cur_size_px), a

    ;; left/top is always 2
    add 2
    ld (_b_cur_rightbottom), a

    pop hl

    call _b_reset

    ret

;; parameters
;; _b_cur_rightbottom
_b_draw_frame:
    push hl

    ld a, (_b_handle_region)
    ld d, 0
    ld e, GLOBAL_PALETTE_WHITE
    rst 0
    .db ERAPI_SetRegionColor

    ld a, 0
    ld b, a
    ld e, a
    ld a, (_b_cur_rightbottom)
    inc a
    inc a
    ld d, a
    ld c, a
    ld a, (_b_handle_region)
    ld h, a
    ld l, 1 ;; fill
    rst 0
    .db ERAPI_DrawRect

    ld a, (_b_handle_region)
    ld d, 0
    ld e, B_CLEAR_TILE_COLOR
    rst 0
    .db ERAPI_SetRegionColor

    ld a, 2
    ld b, a
    ld e, a
    ld a, (_b_cur_rightbottom)
    ld d, a
    ld c, a
    ld a, (_b_handle_region)
    ld h, a
    ld l, 1 ;; fill
    rst 0
    .db ERAPI_DrawRect

    ld a, (_b_handle_region)
    ld d, 0
    ld e, GLOBAL_PALETTE_BLACK
    rst 0
    .db ERAPI_SetRegionColor

    ld a, 2
    ld b, a
    ld e, a
    ld a, (_b_cur_rightbottom)
    ld d, a
    ld c, a
    ld a, (_b_handle_region)
    ld h, a
    ld l, 0 ;; outline
    rst 0
    .db ERAPI_DrawRect

    pop hl

    ret

;; draws one of the board's vertical lines
;;
;; parameters
;; c: the line index
;; e: color
;;
;; clobbers
;; a, b, c, d, e, hl
board_draw_vertical_line_at:
    ;; special case, don't draw the last line
    ld a, (_b_cur_size_tile)
    dec a
    cp c
    ret z

    ld a, (_b_handle_region)
    ld d, 0
    rst 0
    .db ERAPI_SetRegionColor

    ;; calculate x
    ;; x = 2 + (c + 1) * span
    ld a, BOARD_TILE_SIZE_PX
    ld e, c
    inc e
    rst 8
    .db ERAPI_Mul8
    ld d, l
    inc d
    inc d
    ;; d is now starting x

    ld e, 3  ;; starting y
    ld a, (_b_cur_rightbottom)
    sub 1
    ld c, a ;; ending y
    ld b, d ;; ending x, same as starting x

    ld a, (_b_handle_region)
    ld hl, 0
    push hl
    rst 0
    .db ERAPI_DrawLine
    pop hl

    ret

;; draws one of the board's horizontal lines
;;
;; parameters
;; c: the line index
;; e: color
;;
;; clobbers
;; a, b, c, d, e, hl
board_draw_horizontal_line_at:
    ;; special case, don't draw the last line
    ld a, (_b_cur_size_tile)
    dec a
    cp c
    ret z

    ld a, (_b_handle_region)
    ld d, 0
    rst 0
    .db ERAPI_SetRegionColor

    ;; calculate y
    ;; y = 2 + (c + 1) * span
    ld a, BOARD_TILE_SIZE_PX
    ld e, c
    inc e
    rst 8
    .db ERAPI_Mul8
    ld e, l
    inc e
    inc e
    ;; e is now starting y

    ld d, 3  ;; starting x
    ld a, (_b_cur_rightbottom)
    sub 1
    ld b, a ;; ending x
    ld c, e ;; ending y, same as starting y

    ld a, (_b_handle_region)
    ld hl, 0
    push hl
    rst 0
    .db ERAPI_DrawLine
    pop hl

    ret

_b_draw_boundary_lines:
    ;; small puzzles dont have boundary lines
    ld a, (_b_cur_size_tile)
    cp 5
    ret z

    ;; hiding this halt in here as this function is branching
    ;; on puzzle size
    ld a, 60
    halt

    call sound_play_board_boundary_reveal_sfx

    ;; how big is the puzzle? medium and large
    ;; have different boundary lines
    ld a, (_b_cur_size_tile)
    cp 8
    ;; this is a medium puzzle, go draw it
    jr z, _b_draw_boundary_lines__medium

    ;; this is large puzzle, four boundary lines
    ld e, B_BOUNDARY_LINE_COLOR
    ld c, 4
    call board_draw_horizontal_line_at
    ld e, B_BOUNDARY_LINE_COLOR
    ld c, 9
    call board_draw_horizontal_line_at

    ld e, B_BOUNDARY_LINE_COLOR
    ld c, 4
    call board_draw_vertical_line_at
    ld e, B_BOUNDARY_LINE_COLOR
    ld c, 9
    call board_draw_vertical_line_at
    ret

    _b_draw_boundary_lines__medium:
    ;; this is medium puzzle, two boundary lines
    ld e, B_BOUNDARY_LINE_COLOR
    ld c, 3
    call board_draw_horizontal_line_at

    ld e, B_BOUNDARY_LINE_COLOR
    ld c, 3
    call board_draw_vertical_line_at
    ret


;;
;; preps everything to draw something into the
;; current tile
;;
;; parameters
;; e: the color to use
_b_prep_for_tile_draw:
    ;; set chosen color
    ld a, (_b_handle_region)
    ld d, 0
    rst 0
    .db ERAPI_SetRegionColor

    ;; get offset of tileSize*tileX
    ld a, (cursor_board_x)
    ld e, BOARD_TILE_SIZE_PX
    ;; hl=a*e
    rst 8
    .db ERAPI_Mul8
    ;; account for the left/top offset
    inc hl
    inc hl

    ;; push x offset onto stack
    push hl

    ;; get offset of tileSize*tileY
    ld a, (cursor_board_y)
    ld e, BOARD_TILE_SIZE_PX
    ;; hl=a*e
    rst 8
    .db ERAPI_Mul8
    ;; account for the left/top offset 
    inc hl
    inc hl

    ;; load top/bottom
    ld e, l
    inc e
    ld a, l
    dec a
    add BOARD_TILE_SIZE_PX
    ld c, a

    ;; load left/right
    pop hl
    ld b, l
    inc b
    ld a, l
    add BOARD_TILE_SIZE_PX
    ld d, a
    dec d


    ;; and get the region set
    ld a, (_b_handle_region)
    ld h, a
    ret

;; checks if the tile at cursor_board_x/y
;; is a valid part of the puzzle (ie, not blank)
;;
;; parameters
;; cursor_board_x: x
;; cursor_board_y: y
;;
;; returns
;; a: 1 if valid, 0 if not
_b_is_valid_fill:
    ld a, (cursor_board_x)
    ld d, a
    ld a, (cursor_board_y)
    ld e, a
    call puzzle_cell_manager_get_cell
    ret

_b_get_index_into_filled_tiles:
    ;; dont clobber a
    ld d, a

    ld a, (_b_cur_size_tile)
    ld e, a
    ld a, (cursor_board_y)
    ;; hl=a*e
    rst 8
    .db ERAPI_Mul8
    ld a, (cursor_board_x)
    add l
    ;; a is now set to the tile index for _b_filled_tiles
    ld hl, _b_filled_tiles
    ld b, 0
    ld c, a
    ;; move hl to point to the correct tile
    add hl, bc

    ;; restore a
    ld a, d
    ret

;; returns the current tile value for the current
;; tile as determined by cursor x/y
_b_get_tile:
    ;; this sets hl to point to the correct tile
    call _b_get_index_into_filled_tiles

    ld a, (hl)
    ret

;;
;; sets the current tile in the grid
;; as determined by cursor x/y
;;
;; a: what to set it to
_b_set_tile:
    ;; this sets hl to point to the correct tile
    call _b_get_index_into_filled_tiles

    ld (hl), a
    ret


board_do_repeat:
    ;; set _b_last_tile_value into cursor x/y
    ;; if last was fill, penalize if it's an invalid fill
    ;; otherwise, just slam this decision into the tile
    ;; update filled count accordingly for all cases

    ;; if cur tile and last decision match, nothing to do except sfx
    call _b_get_tile
    ld b, a
    ld a, (_b_last_tile_value)
    cp b
    jp nz, board_do_repeat__do_full_repeat
    ;; this is not a "full" repeat because the tile is already
    ;; what the user is repeating with. There is nothing to do for
    ;; this except play the sound effect
    ld a, (_b_last_tile_value)
    cp B_TILE_XED
    call z, sound_play_tile_x_out_sfx
    ld a, (_b_last_tile_value)
    cp B_TILE_FILLED
    call z, sound_play_tile_black_out_sfx
    cp B_TILE_CLEAR
    call z, sound_play_tile_clear_sfx
    ret
    

    board_do_repeat__do_full_repeat:
    ;; is last decision a fill? then see if it's legal
    cp B_TILE_FILLED
    jr nz, board_do_repeat__skip_fill

    ;; this is a fill, just let _b_fill_tile handle it
    call _b_fill_tile
    ret

    board_do_repeat__skip_fill:
    ;; this is not a fill, but is the tile we are writing into 
    ;; already filled? if so, need to decrement fill count
    ld a, b ;; b still holds this tile's current value
    cp B_TILE_FILLED
    jr nz, board_do_repeat__skip_decrement
    ld a, (_b_cur_filled_count)
    dec a
    ld (_b_cur_filled_count), a

    board_do_repeat__skip_decrement:
    ld a, (_b_last_tile_value)
    cp B_TILE_XED
    call z, sound_play_tile_x_out_sfx
    cp B_TILE_CLEAR
    call z, sound_play_tile_clear_sfx
    call _b_set_tile

    ;; purposely fall through

_b_render_tile:
    ;; clear the tile regardless
    ld e, B_CLEAR_TILE_COLOR
    call _b_prep_for_tile_draw
    ld l, 1 ;; fill
    rst 0
    .db ERAPI_DrawRect

    call _b_get_tile

    cp B_TILE_CLEAR
    ;; we have already cleared the tile
    ret z

    cp B_TILE_XED
    jp nz, _b_render_tile__skip_xed

    ;; XED TILE
    ld e, B_XED_TILE_COLOR
    call _b_prep_for_tile_draw

    dec d
    inc e
    inc b
    dec c

    ;; put a duration of zero onto the stack
    ld hl, 0
    push hl
    rst 0
    .db ERAPI_DrawLine

    ;; now draw the other line to form a complete X
    ;; swap x's, which are b and d
    ;; leave y's as they are, this accomplishes the opposite leg of the x
    ld a, b
    ld b, d
    ld d, a
    ld a, (_b_handle_region)

    rst 0
    .db ERAPI_DrawLine
    pop hl
    ret

    _b_render_tile__skip_xed:
    ;; by process of elimination, this is a filled tile
    ld e, B_FILLED_TILE_COLOR
    call _b_prep_for_tile_draw
    ld l, 1 ;; fill
    rst 0
    .db ERAPI_DrawRect
    ret

;; fills the current tile as determined by
;; cursor x/y
;;
;; possibly this is a bad fill, and this function handles that
_b_fill_tile:
    ;; regardless, fill the tile in
    ld e, B_FILLED_TILE_COLOR
    ;; TODO: can we just pass in DrawRect or DrawLine?
    call _b_prep_for_tile_draw
    ld l, 1 ;; fill
    rst 0
    .db ERAPI_DrawRect

    ;; show the user they just filled the tile in
    ld a, 1
    halt

    ;; now, was this a mistake?
    call _b_is_valid_fill
    cp 1
    jr z, _b_fill_tile__valid_fill

    ;; yup, this was a mistake
    call clock_show_penalty
    call game_sad_mascot
    call clock_penalty
    call sound_play_tile_mistake_sfx
    ld a, 30
    halt

    ;; now put the tile back
    call _b_render_tile
    call clock_hide_penalty

    ;; if the game isn't over, we need to go back to happy mascot
    ld a, (clock_empty)
    cp 1
    ;; clock is empty, game is over, so keep sad face
    ret z

    ;; clock is not empty, go back to happy face
    call game_happy_mascot
    ret

    _b_fill_tile__valid_fill:
    ;; the tile is already visually filled, just need to do bookkeeping
    ;; set the tile in the grid
    ld a, B_TILE_FILLED
    call _b_set_tile
    ;; increment the total filled count
    ld a, (_b_cur_filled_count)
    inc a
    ld (_b_cur_filled_count), a
    call sound_play_tile_black_out_sfx
    ret

;; the user has requested a tile be blacked out
;; this orchestrator considers all possibilities:
;; - it's already blacked out, so clear it
;; - it's a mistake, so penalize and leave cleared
;; - black it out
board_handle_black_out_request:
    ;; is this tile already filled?
    call _b_get_tile
    cp B_TILE_FILLED

    jp z, board_handle_black_out_request__do_clear
    ;; this is a fill

    ;; save this as the last value 
    ld a, B_TILE_FILLED
    ld (_b_last_tile_value), a

    call _b_fill_tile
    ret

    board_handle_black_out_request__do_clear:
    ld a, B_TILE_CLEAR
    ld (_b_last_tile_value), a
    ;; decrement the total filled count
    ld a, (_b_cur_filled_count)
    dec a
    ld (_b_cur_filled_count), a
    ;; clear the tile in the grid
    ld a, B_TILE_CLEAR
    call _b_set_tile
    call _b_render_tile
    call sound_play_tile_clear_sfx
    ret

board_handle_x_out_request:
    ;; is this tile already xed out?
    call _b_get_tile
    cp B_TILE_XED
    jr z, board_handle_x_out_request__do_clear

    ;; this tile was not xed out, so x it out

    ;; was it previously filled? if so, decrement filled_count
    cp B_TILE_FILLED
    jr nz, board_handle_x_out_request__skip_decrement

    ld a, (_b_cur_filled_count)
    dec a 
    ld (_b_cur_filled_count), a

    board_handle_x_out_request__skip_decrement:

    ;; x it out
    call sound_play_tile_x_out_sfx
    ld a, B_TILE_XED
    ld (_b_last_tile_value), a
    call _b_set_tile
    jr board_handle_x_out_request__render

    board_handle_x_out_request__do_clear:
    ;; clear it
    ld a, B_TILE_CLEAR
    ld (_b_last_tile_value), a
    call _b_set_tile
    call sound_play_tile_clear_sfx

    board_handle_x_out_request__render:
    call _b_render_tile
    ret

_b_handle_region:
    .db 0

_b_cur_size_tile:
    .db 0
_b_cur_size_px:
    .db 0
_b_cur_rightbottom:
    .db 0
_b_cur_filled_count:
    .db 0
_b_total_filled_count_to_win:
    .db 0
_b_filled_tiles:
    .include '_b_filled_tiles.asm'
_b_last_tile_value:
    .db 0