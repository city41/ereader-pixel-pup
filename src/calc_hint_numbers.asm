_CHN_BLANK = 0
_CHN_FILLED = 1


_chn_cur_filled_count:
    .db 0
_chn_cur_count_type:
    .db 0

_chn_cur_hint_number_pointer:
    .dw 0

calc_hint_numbers_calculate:
    ;; zero out the numbers to clear out numbers from the previous puzzle
    ld hl, hint_numbers_top
    ld b, 240 ; total number of bytes to clear
    ld a, 0   ; set them all to zero

    calc_hint_numbers_calculate__clear_loop:
    ld (hl), a
    inc hl
    djnz calc_hint_numbers_calculate__clear_loop

    ;; load up the number of columns
    ld a, (_b_cur_size_tile)
    ;; outer loop counters
    ld b, a
    ;; column index
    ld c, 0

    _chn_calc_top__outer_columns_loop:
    ;; set up the hint number pointer based on current column
    ld hl, hint_numbers_top
    ld d, 0
    ld e, c
    ;; move forward colIndex*6
    add hl, de
    add hl, de
    add hl, de
    add hl, de
    add hl, de
    add hl, de
    add hl, de
    add hl, de

    ;; hl now points at the first byte hint number for this column
    ld (_chn_cur_hint_number_pointer), hl

    ;; save outer loop counters
    push bc

    ld a, (_b_cur_size_tile)
    ;; b is the cell count, 1 based
    ld b, a
    ;; c is the y index, starting at the bottom, 0 based, decremented below
    ld c, a

    ;; reset filled tile count
    ld a, 0
    ld (_chn_cur_filled_count), a
    ;; currently looking for blanks
    ld a, _CHN_BLANK
    ld (_chn_cur_count_type), a

    _chn_calc_top__inner_column_loop:
    ;; move up to next cell in the y direction
    dec c

    ;; move y into e
    ld e, c
    ;; move x into d, which is in the outer loop counters
    ;; save inner counters to hl
    push bc
    pop hl
    ;; restore outer counters
    pop bc
    ld d, c
    ;; put outer counters back on stack
    push bc
    ;; restore inner counters
    push hl
    pop bc

    push bc
    call puzzle_cell_manager_get_cell
    pop bc

    ;; a is either 0 (blank) or 1 (filled)
    ld d, a
    ld a, (_chn_cur_count_type)
    cp d
    ;; is it the same type we are counting?
    jr z, _chn_calc_top__same_count_type
    ;; we just flipped types
    ;; if we were counting filled, then we just got a hint number
    cp _CHN_FILLED
    jr nz, _chn_calc_top__was_counting_blanks
    ;; ok we got a hint number, save it off
    ld hl, (_chn_cur_hint_number_pointer)
    ld a, (_chn_cur_filled_count)
    ld (hl), a
    inc hl
    ld (_chn_cur_hint_number_pointer), hl
    ;; need to reset filled count
    ld a, 0
    ld (_chn_cur_filled_count), a
    ;; and switch to counting blanks
    ld a, _CHN_BLANK
    jr _chn_calc_top__done_with_flip

    _chn_calc_top__was_counting_blanks:
    ;; since we just counted one filled tile, add it to filled count
    ;; this should be zero
    ld a, (_chn_cur_filled_count)
    inc a
    ld (_chn_cur_filled_count), a
    ;; so now switch to counting filled
    ld a, _CHN_FILLED

    _chn_calc_top__done_with_flip:
    ld (_chn_cur_count_type), a
    jr _chn_calc_top__skip_same_count_type

    _chn_calc_top__same_count_type:
    ;; we are counting the same type, if it is filled, we need to increment the count
    cp _CHN_FILLED
    jr nz, _chn_calc_top__skip_increment
    ld a, (_chn_cur_filled_count)
    inc a
    ld (_chn_cur_filled_count), a

    _chn_calc_top__skip_increment:
    _chn_calc_top__skip_same_count_type:

    ;; is this column done?
    ld a, c
    cp 0
    ;; it is not done, go do it again
    jr nz, _chn_calc_top__inner_column_loop

    ;; get ready for the next column

    ;; first, save off whatever fill count we arrived at, even zero
    ld a, (_chn_cur_filled_count)
    ld hl, (_chn_cur_hint_number_pointer)
    ld (hl), a

    ; restore outer loop counters
    pop bc
    inc c
    djnz _chn_calc_top__outer_columns_loop


    ;; fall straight through 

_chn_calc_left:
    ;; load up the number of rows
    ld a, (_b_cur_size_tile)
    ;; outer loop counters
    ld b, a
    ;; row index
    ld c, 0

    _chn_calc_left__outer_columns_loop:
    ;; set up the hint number pointer based on current row
    ld hl, hint_numbers_left
    ld d, 0
    ld e, c
    ;; move forward rowIndex*8
    add hl, de
    add hl, de
    add hl, de
    add hl, de
    add hl, de
    add hl, de
    add hl, de
    add hl, de

    ;; hl now points at the first byte hint number for this row
    ld (_chn_cur_hint_number_pointer), hl

    ;; save outer loop counters
    push bc

    ld a, (_b_cur_size_tile)
    ;; b is the cell count, 1 based
    ld b, a
    ;; c is the x index, starting at the right, 0 based, decremented below
    ld c, a

    ;; reset filled tile count
    ld a, 0
    ld (_chn_cur_filled_count), a
    ;; currently looking for blanks
    ld a, _CHN_BLANK
    ld (_chn_cur_count_type), a

    _chn_calc_left__inner_column_loop:
    ;; move left to next cell in the x direction
    dec c

    ;; move x into d
    ld d, c
    ;; move y into e, which is in the outer loop counters
    ;; save inner counters to hl
    push bc
    pop hl
    ;; restore outer counters
    pop bc
    ld e, c
    ;; put outer counters back on stack
    push bc
    ;; restore inner counters
    push hl
    pop bc

    push bc
    call puzzle_cell_manager_get_cell
    pop bc

    ;; a is either 0 (blank) or 1 (filled)
    ld d, a
    ld a, (_chn_cur_count_type)
    cp d
    ;; is it the same type we are counting?
    jr z, _chn_calc_left__same_count_type
    ;; we just flipped types
    ;; if we were counting filled, then we just got a hint number
    cp _CHN_FILLED
    jr nz, _chn_calc_left__was_counting_blanks
    ;; ok we got a hint number, save it off
    ld hl, (_chn_cur_hint_number_pointer)
    ld a, (_chn_cur_filled_count)
    ld (hl), a
    inc hl
    ld (_chn_cur_hint_number_pointer), hl
    ;; need to reset filled count
    ld a, 0
    ld (_chn_cur_filled_count), a
    ;; and switch to counting blanks
    ld a, _CHN_BLANK
    jr _chn_calc_left__done_with_flip

    _chn_calc_left__was_counting_blanks:
    ;; since we just counted one filled tile, add it to filled count
    ;; this should be zero
    ld a, (_chn_cur_filled_count)
    inc a
    ld (_chn_cur_filled_count), a
    ;; so now switch to counting filled
    ld a, _CHN_FILLED

    _chn_calc_left__done_with_flip:
    ld (_chn_cur_count_type), a
    jr _chn_calc_left__skip_same_count_type

    _chn_calc_left__same_count_type:
    ;; we are counting the same type, if it is filled, we need to increment the count
    cp _CHN_FILLED
    jr nz, _chn_calc_left__skip_increment
    ld a, (_chn_cur_filled_count)
    inc a
    ld (_chn_cur_filled_count), a

    _chn_calc_left__skip_increment:
    _chn_calc_left__skip_same_count_type:

    ;; is this row done?
    ld a, c
    cp 0
    ;; it is not done, go do it again
    jr nz, _chn_calc_left__inner_column_loop

    ;; get ready for the next row

    ;; first, save off whatever fill count we arrived at, even zero
    ld a, (_chn_cur_filled_count)
    ld hl, (_chn_cur_hint_number_pointer)
    ld (hl), a

    ; restore outer loop counters
    pop bc
    inc c
    djnz _chn_calc_left__outer_columns_loop

    ret

hint_numbers_top:
    .include '_hint_numbers_top_and_left.asm'
hint_numbers_left:
    .include '_hint_numbers_top_and_left.asm'