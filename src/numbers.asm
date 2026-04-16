N_TOP_WIDTH_TILES = BOARD_GRID_MAX_SIZE_TILES
N_TOP_HEIGHT_TILES = 7
N_TOP_X_TILES = BOARD_GRID_X_TILES
N_TOP_Y_TILES = BOARD_GRID_Y_TILES - N_TOP_HEIGHT_TILES
N_TOP_X_SPAN = 6
N_TOP_Y_SPAN = 6

N_LEFT_WIDTH_TILES = 7
N_LEFT_HEIGHT_TILES = BOARD_GRID_MAX_SIZE_TILES
N_LEFT_X_TILES = BOARD_GRID_X_TILES - N_LEFT_WIDTH_TILES
N_LEFT_Y_TILES = BOARD_GRID_Y_TILES
N_LEFT_X_SPAN = 6
N_LEFT_Y_SPAN = 6

N_UNFOCUSED_NUMBER_COLOR = GLOBAL_PALETTE_BLACK
N_FOCUSED_NUMBER_COLOR = GLOBAL_PALETTE_WHITE
N_FOCUSED_BG_COLOR = GLOBAL_PALETTE_RED

numbers_init:
    ; ERAPI_CreateRegion()
    ; h = bg# (0-3)
    ; l = palette bank (0-15)
    ; d = left in tiles
    ; e = top in tiles
    ; b = width in tiles
    ; c = height in tiles
    ld b, N_TOP_WIDTH_TILES
    ld c, N_TOP_HEIGHT_TILES
    ld d, N_TOP_X_TILES
    ld e, N_TOP_Y_TILES
    ld h, BG_INDEX_BOARD
    ld l, PALETTE_INDEX_GLOBAL
    rst 0
    .db ERAPI_CreateRegion
    ld  (_n_top_region), a

    ; ERAPI_CreateRegion()
    ; h = bg# (0-3)
    ; l = palette bank (0-15)
    ; d = left in tiles
    ; e = top in tiles
    ; b = width in tiles
    ; c = height in tiles
    ld b, N_LEFT_WIDTH_TILES
    ld c, N_LEFT_HEIGHT_TILES
    ld d, N_LEFT_X_TILES
    ld e, N_LEFT_Y_TILES
    ld h, BG_INDEX_BOARD
    ld l, PALETTE_INDEX_GLOBAL
    rst 0
    .db ERAPI_CreateRegion
    ld  (_n_left_region), a
    ret

numbers_render_changed:
    ld a, (cursor_board_last_x)
    ld c, a
    call numbers_draw_top_at

    ld a, (cursor_board_x)
    ld c, a
    call numbers_draw_top_at

    ld a, (cursor_board_last_y)
    ld c, a
    call numbers_draw_left_at

    ld a, (cursor_board_y)
    ld c, a
    call numbers_draw_left_at
    ret

numbers_on_unpause:
    ld a, (_b_cur_size_tile)
    ld b, a
    ld c, 0

    numbers_on_unpause__loop:

    push bc
    call numbers_draw_top_at
    pop bc
    push bc
    call numbers_draw_left_at
    pop bc

    inc c
    djnz numbers_on_unpause__loop
    ret

numbers_on_pause:
numbers_on_stop:
    ld a, (_n_left_region)
    ld e, GLOBAL_PALETTE_TRANS
    rst 0
    .db ERAPI_SetRegionColor

    rst 0
    .db ERAPI_ClearRegion

    ld a, (_n_top_region)
    ld e, GLOBAL_PALETTE_TRANS
    rst 0
    .db ERAPI_SetRegionColor

    rst 0
    .db ERAPI_ClearRegion
    ret

;; draws a bg into the top section for one column
;; then draws the numbers on top of it
;; parameters
;; c: the column index
;;
;; clobbers
;; a, b, c, d, e, h, l
numbers_draw_top_at:
    ;; _n_draw_region
    ld a, (_n_top_region)
    ld (_n_draw_region), a

    ;; BACKGROUND
    push bc

    ;; figure out the color to use
    ;; c == cursor_board_x -> focused
    ;; c is odd -> white
    ;; else -> grey
    ld a, (cursor_board_x)
    cp c
    jr z, _n_draw_top_bg__focused
    ld a, c
    and 1
    jr z, _n_draw_top_bg__grey

    ;; white
    ld e, GLOBAL_PALETTE_WHITE
    jr _n_draw_top_bg__color_done

    _n_draw_top_bg__focused:
    ld e, N_FOCUSED_BG_COLOR
    jr _n_draw_top_bg__color_done

    _n_draw_top_bg__grey:
    ld e, GLOBAL_PALETTE_LIGHT_GREY

    _n_draw_top_bg__color_done:
    ld a, (_n_draw_region)
    rst 0
    .db ERAPI_SetRegionColor

    ;; now calculate left
    ;; left = c * span + offset
    ld a, c
    ld e, N_TOP_X_SPAN
    rst 8
    .db ERAPI_Mul8
    ;; add on the offset
    inc hl
    inc hl
    ld a, l
    ld b, a ; left
    add 5
    ld d, a ; right
    ld e, 1 ; top 
    ld c, N_TOP_HEIGHT_TILES * 8 - 2 ; bottom
    ld a, (_n_draw_region)
    ld h, a
    ld l, 1
    rst 0
    .db ERAPI_DrawRect

    pop bc

_numbers_draw_top_numbers_at:
    ;; _n_num_color
    ld a, (cursor_board_x)
    cp c
    jr z, numbers_draw_top_numbers_at__focused
    ;; this is an unfocused row
    ld a, N_UNFOCUSED_NUMBER_COLOR
    jr numbers_draw_top_numbers_at__color_done

    numbers_draw_top_numbers_at__focused:
    ld a, N_FOCUSED_NUMBER_COLOR

    numbers_draw_top_numbers_at__color_done:
    ld (_n_num_color), a

    ;; _n_num_x = c * span + offset
    ld a, c
    ld e, N_TOP_X_SPAN
    rst 8
    .db ERAPI_Mul8
    ;; add on the offset
    inc hl
    inc hl
    ld a, l
    ld (_n_num_x), a

    ;; _n_num_y
    ld a, 44
    ld (_n_num_y), a

    ;; hl -> pointer to hint numbers
    ;; pointer = basePointer + 8*c
    ld a, c
    ld e, 8
    rst 8
    .db ERAPI_Mul8
    ld bc, hint_numbers_top
    add hl, bc

    ld b, 8
    _numbers_draw_top_numbers_at__draw_loop:

    ;; first number
    ld a, (hl)
    ld (_n_num_value), a
    call _n_draw_number
    ;; move y
    ld a, (_n_num_y)
    sub N_TOP_Y_SPAN
    ld (_n_num_y), a
    ;; point to next hint value
    inc hl

    ;; we want to draw a zero if it is the first zero
    ;; but don't draw any more zeros
    ld a, (hl)
    cp 0
    ret z

    djnz _numbers_draw_top_numbers_at__draw_loop
    ret


;; draws a bg into the left section for one column
;; then draws the numbers on top of it
;; parameters
;; c: the column index
;;
;; clobbers
;; a, b, c, d, e, h, l
numbers_draw_left_at:
    ;; _n_draw_region
    ld a, (_n_left_region)
    ld (_n_draw_region), a

    ;; BACKGROUND
    push bc

    ;; figure out the color to use
    ;; c == cursor_board_y -> focused
    ;; c is odd -> white
    ;; else -> grey
    ld a, (cursor_board_y)
    cp c
    jr z, _n_draw_left_bg__focused
    ld a, c
    and 1
    jr z, _n_draw_left_bg__grey

    ;; white
    ld e, GLOBAL_PALETTE_WHITE
    jr _n_draw_left_bg__color_done

    _n_draw_left_bg__focused:
    ld e, N_FOCUSED_BG_COLOR
    jr _n_draw_left_bg__color_done

    _n_draw_left_bg__grey:
    ld e, GLOBAL_PALETTE_LIGHT_GREY

    _n_draw_left_bg__color_done:
    ld a, (_n_draw_region)
    rst 0
    .db ERAPI_SetRegionColor

    ;; now calculate top
    ;; top = c * span + offset
    ld a, c
    ld e, N_LEFT_Y_SPAN
    rst 8
    .db ERAPI_Mul8
    ;; add on the offset
    inc hl
    inc hl
    ld a, l
    ld e, a ; top
    add N_LEFT_Y_SPAN
    ld c, a ; bottom
    ld b, 1 ; left 
    ld d, N_TOP_HEIGHT_TILES * 8 - 2 ; bottom
    ld a, (_n_draw_region)
    ld h, a
    ld l, 1
    rst 0
    .db ERAPI_DrawRect

    pop bc

_numbers_draw_left_numbers_at:
    ;; _n_num_color
    ld a, (cursor_board_y)
    cp c
    jr z, numbers_draw_left_numbers_at__focused
    ;; this is an unfocused row
    ld a, N_UNFOCUSED_NUMBER_COLOR
    jr numbers_draw_left_numbers_at__color_done

    numbers_draw_left_numbers_at__focused:
    ld a, N_FOCUSED_NUMBER_COLOR

    numbers_draw_left_numbers_at__color_done:
    ld (_n_num_color), a

    ;; _n_num_y = c * span + offset
    ld a, c
    ld e, N_LEFT_Y_SPAN
    rst 8
    .db ERAPI_Mul8
    ;; add on the offset
    inc hl
    inc hl
    ld a, l
    ld (_n_num_y), a

    ;; _n_num_x
    ld a, 44
    ld (_n_num_x), a

    ;; hl -> pointer to hint numbers
    ;; pointer = basePointer + 8*c
    ld a, c
    ld e, 8
    rst 8
    .db ERAPI_Mul8
    ld bc, hint_numbers_left
    add hl, bc

    ld b, 8
    _numbers_draw_left_numbers_at__draw_loop:
    ld a, (hl)
    ld (_n_num_value), a
    call _n_draw_number
    ;; move x
    ld a, (_n_num_x)
    sub N_LEFT_Y_SPAN
    ld (_n_num_x), a
    ;; point to next hint value
    inc hl

    ;; we want to draw a zero if it is the first zero
    ;; but don't draw any more zeros
    ld a, (hl)
    cp 0
    ret z

    djnz _numbers_draw_left_numbers_at__draw_loop
    ret

;; parameters
;; _n_draw_region: region to draw into
;; _n_num_x: x in pixels
;; _n_num_y: y in pixels
;; _n_num_value: the current hint value
;; _n_num_color: what color to use
_n_draw_number:
    push hl
    push bc

    ld e, _N_BITMAP_SIZE_BYTES
    ;; hl=a*e
    rst 8
    .db ERAPI_Mul8
    ld de, _n_zero
    ;; hl is now pointing at the correct
    ;; number bitmap data
    add hl, de

    ld a, (_n_num_color)
    ld e, a
    ld a, (_n_draw_region)
    ld d, 0
    rst 0
    .db ERAPI_SetRegionColor

    ;; 5 rows
    ld b, 5

    _n_draw_number__rows_loop:
    push bc
    ld b, 5
    _n_draw_number__row_loop:

    ld a, (hl)
    cp 0
    ;; this is an empty pixel, skip SetPixel
    jr z, _n_draw_number__pixel_done

    ;; figure out x
    ld a, (_n_num_x)
    add b
    ld d, a ;; move x to its final spot

    ;; go back and get the outer b
    pop bc
    ;; figure out y
    ld a, (_n_num_y)
    add b
    ld e, a ;; move y to its final spot
    ;; put the outer b back onto the stack
    push bc

    ;; now restore the inner b
    ;; d = _n_num_x + b
    ;; so b = d - _n_num_x 
    ld a, (_n_num_x)
    ld c, a
    ld a, d
    sub c
    ld b, a

    ld a, (_n_draw_region)
    rst 0
    .db ERAPI_SetPixel

    _n_draw_number__pixel_done:
    inc hl
    djnz _n_draw_number__row_loop

    ;; restore outer loop b
    pop bc
    djnz _n_draw_number__rows_loop

    pop bc
    pop hl
    ret

_n_top_region:
    .db 0
_n_left_region:
    .db 0
_n_draw_region:
    .db 0
_n_num_x:
    .db 0
_n_num_y:
    .db 0
_n_num_value:
    .db 0
_n_num_color:
    .db 0

;; NOTE: numbers need to be rotated 180
;; as _n_draw_number uses b loops which 
;; go back to front
_n_zero:
    .db 0, 0, 1, 1, 0
    .db 0, 1, 0, 0, 1
    .db 0, 1, 0, 0, 1
    .db 0, 1, 0, 0, 1
    .db 0, 0, 1, 1, 0

_n_one:
    .db 0, 0, 1, 0, 0
    .db 0, 0, 1, 0, 0
    .db 0, 0, 1, 0, 0
    .db 0, 0, 1, 0, 0
    .db 0, 0, 1, 1, 0
_n_one_end:
_N_BITMAP_SIZE_BYTES = _n_one_end - _n_one

_n_two:
    .db 0, 1, 1, 1, 1
    .db 0, 0, 0, 0, 1
    .db 0, 1, 1, 1, 1
    .db 0, 1, 0, 0, 0
    .db 0, 0, 1, 1, 1

_n_three:
    .db 0, 0, 1, 1, 1
    .db 0, 1, 0, 0, 0
    .db 0, 0, 1, 1, 1
    .db 0, 1, 0, 0, 0
    .db 0, 0, 1, 1, 1

_n_four:
    .db 0, 1, 0, 0, 0
    .db 0, 1, 0, 0, 0
    .db 0, 1, 1, 1, 1
    .db 0, 1, 0, 0, 1
    .db 0, 1, 0, 0, 1

_n_five:
    .db 0, 0, 1, 1, 1
    .db 0, 1, 0, 0, 0
    .db 0, 0, 1, 1, 1
    .db 0, 0, 0, 0, 1
    .db 0, 1, 1, 1, 1

_n_six:
    .db 0, 0, 1, 1, 0
    .db 0, 1, 0, 0, 1
    .db 0, 1, 1, 1, 1
    .db 0, 0, 0, 0, 1
    .db 0, 1, 1, 1, 0

_n_seven:
    .db 0, 0, 0, 1, 0
    .db 0, 0, 0, 1, 0
    .db 0, 0, 1, 0, 0
    .db 0, 1, 0, 0, 0
    .db 0, 1, 1, 1, 1

_n_eight:
    .db 0, 0, 1, 1, 0
    .db 0, 1, 0, 0, 1
    .db 0, 0, 1, 1, 0
    .db 0, 1, 0, 0, 1
    .db 0, 0, 1, 1, 0

_n_nine:
    .db 0, 0, 1, 1, 0
    .db 0, 1, 0, 0, 0
    .db 0, 1, 1, 1, 1
    .db 0, 1, 0, 0, 1
    .db 0, 0, 1, 1, 0

_n_ten:
    .db 1, 1, 1, 0, 1
    .db 1, 0, 1, 0, 1
    .db 1, 0, 1, 0, 1
    .db 1, 0, 1, 0, 1
    .db 1, 1, 1, 0, 1

_n_eleven:
    .db 0, 1, 0, 1, 0
    .db 0, 1, 0, 1, 0
    .db 0, 1, 0, 1, 0
    .db 0, 1, 0, 1, 0
    .db 0, 1, 0, 1, 0

_n_twelve:
    .db 1, 1, 1, 0, 1
    .db 0, 0, 1, 0, 1
    .db 1, 1, 1, 0, 1
    .db 1, 0, 0, 0, 1
    .db 1, 1, 1, 0, 1

_n_thirteen:
    .db 0, 1, 1, 0, 1
    .db 1, 0, 0, 0, 1
    .db 0, 1, 1, 0, 1
    .db 1, 0, 0, 0, 1
    .db 0, 1, 1, 0, 1

_n_fourteen:
    .db 1, 0, 0, 0, 1
    .db 1, 0, 0, 0, 1
    .db 1, 1, 1, 0, 1
    .db 1, 0, 1, 0, 1
    .db 1, 0, 1, 0, 1

_n_fifteen:
    .db 1, 1, 1, 0, 1
    .db 1, 0, 0, 0, 1
    .db 1, 1, 1, 0, 1
    .db 0, 0, 1, 0, 1
    .db 1, 1, 1, 0, 1