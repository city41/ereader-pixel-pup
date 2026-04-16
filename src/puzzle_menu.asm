PM_ENTRIES_PER_ROW = 5
PM_ENTRIES_PER_ROW_PAINTING = 4

PM_START_X = 46
PM_START_X_PAINTING = (240 - 75) / 2 + 7
PM_START_Y = 26
PM_START_Y_PAINTING = (160 - 60) / 2 + 7
PM_SPAN = 36
PM_SPAN_PAINTING = 15

PM_CURSOR_START_X = PM_START_X
PM_CURSOR_START_X_PAINTING = PM_START_X_PAINTING + 12
PM_CURSOR_START_Y = PM_START_Y - 18
PM_CURSOR_START_Y_PAINTING = PM_START_Y_PAINTING + 2

puzzle_menu_init:
    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld e, PALETTE_INDEX_GLOBAL
    ld hl, _pm_sprite_clear_flash_x
    rst 0
    .db ERAPI_SpriteCreate
    ld (_pm_handle_clear_flash_x), hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, 120
    ld bc, 14
    rst  0
    .db  ERAPI_SetSpritePos

    rst 0
    .db ERAPI_SpriteHide

    ;; now load up all of the unsolved sprites
    ld b, PUZZLE_COLLECTION_MAX_PUZZLES
    ld c, 0
    puzzle_menu_init__loop:

    ld hl, _pm_unsolved_sprite
    ld e, PALETTE_INDEX_GLOBAL
    rst 0
    .db ERAPI_SpriteCreate
    ;; move handle to de
    push hl
    pop de
    ld hl, _pm_unsolved_sprite_handles
    push bc
    ld b, 0
    add hl, bc
    add hl, bc
    ld (hl), e
    inc hl
    ld (hl), d
    pop bc

    inc c
    djnz puzzle_menu_init__loop

    ;; CURSOR
    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld e, PALETTE_INDEX_GLOBAL
    ld hl, _pm_sprite_menu_cursor
    rst 0
    .db ERAPI_SpriteCreate
    ld (_pm_handle_cursor), hl

    ;; auto animate the cursor up and down for a simple bob
    ;; hl = sprite handle
    ;; de = sprite frame duration in system frames
    ;; bc =
    ;; bc: 0 = Start Animating Forever
    ;;     1 = Stop Animation
    ;;     2 > Number of frames to animate for -2 (ex. 12 animates for 10 frames)
    ld de, 60
    ld bc, 0
    rst 0
    .db ERAPI_SpriteAutoAnimate
    ret

puzzle_menu_on_start:
    ;; get the puzzle count
    ld hl, scan_puzzle_buffer + PUZZLE_COLLECTION_PUZZLE_COUNT_OFFSET
    ld a, (hl)
    ld (_pm_puzzle_count), a

    ;; calc num rows
    ;; numRows = puzzleCount / entriesPerRow
    ld h, 0
    ld l, a
    ld a, (_pm_entries_per_row)
    ld d, 0
    ld e, a
    rst 8
    .db ERAPI_Div
    ld a, l
    ld (_pm_num_rows), a

    ;; load the puzzle icons in a grid
    ;; set up the loop counter
    ld a, (_pm_puzzle_count)
    ld b, a
    ld c, 0

    ;; point to the first puzzle
    ld hl, scan_puzzle_buffer + PUZZLE_COLLECTION_PUZZLES_OFFSET
    ld (_pm_cur_puzzle_pointer), hl

    puzzle_menu_on_start__loop:

    ;; this will either grab a real puzzle sprite if the puzzle is solved
    ;; or an unsolved sprite if not
    push bc
    call _pm_get_puzzle_sprite_handle
    pop bc
    push bc
    ;; save the sprite handle to the stack
    push hl

    ;; is this puzzle cleared? if so, scale it up
    ;; a is 0 if not cleared
    cp 0
    jr z, puzzle_menu_on_start__skip_scale

    push bc
    ld c, 0
    ld de, 0x80
    rst 0
    .db ERAPI_SpriteAutoScaleUntilSize
    pop bc


    puzzle_menu_on_start__skip_scale:
    ;; now position the sprite
    ;; yi = index / entriesPerRow
    ld a, (_pm_entries_per_row)
    ld d, 0
    ld e, a
    ld h, 0
    ld l, c
    ;; yi=index/entriesPerRow
    ;; hl=hl/de
    rst 8
    .db ERAPI_Div
    ;; hl is now yi
    ld a, (_pm_span)
    ld d, 0
    ld e, a
    rst 8
    .db ERAPI_Mul16
    ;; hl is now yIndex*span
    ld a, (_pm_start_y)
    ld d, 0
    ld e, a
    add hl, de

    ;; now add on the position offset
    ld a, (_pm_position_offset)
    ld b, a
    ld a, l
    add b
    ld l, a

    ;; hl is now ypx, put on stack
    push hl

    ;; xi = index % entriesPerRow
    ld a, (_pm_entries_per_row)
    ld d, 0
    ld e, a
    ld h, 0
    ld l, c
    ;; xi=index%entriesPerRow
    ;; hl=hl%de
    rst 8
    .db ERAPI_Mod
    ;; hl is now xi
    ld a, (_pm_span)
    ld d, 0
    ld e, a
    rst 8
    .db ERAPI_Mul16

    ;; hl is now xIndex*span
    ld a, (_pm_start_x)
    ld d, 0
    ld e, a
    add hl, de

    ;; now add on the position offset
    ld a, (_pm_position_offset)
    ld b, a
    ld a, l
    add b
    ld l, a

    ;; hl is now xpx, put on stack
    push hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ;; pull x off stack
    pop de
    ;; pull y off stack
    pop bc
    ;; pull sprite handle in
    pop hl
    rst  0
    .db  ERAPI_SetSpritePos

    ;; and make sure it is not hidden
    rst 0
    .db ERAPI_SpriteShow

    ;; restore loop counters
    pop bc

    inc c

    djnz puzzle_menu_on_start__loop

    ld hl, (_pm_handle_cursor)
    rst 0
    .db ERAPI_SpriteShow

    call _pm_set_cur_puzzle

    ret

puzzle_menu_frame:
    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_SELECT
    jr nz, _pm_exit

    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_A
    jr z, puzzle_menu_frame__a_not_pressed
    call _pm_set_chosen_puzzle
    call sound_play_puzzle_chosen_sfx
    ld a, 20
    halt
    ld a, 1
    ret

    puzzle_menu_frame__a_not_pressed:

    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_LEFT
    call nz, _pm_handle_left

    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_RIGHT
    call nz, _pm_handle_right

    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_UP
    call nz, _pm_handle_up

    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_DOWN
    call nz, _pm_handle_down

    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_LRUD

    call nz, sound_play_cursor_move_sfx

    call _pm_clear_flash_frame

    ;; indicate to the caller no puzzle was chosen
    ld a, 0
    ret

_pm_exit:
    ld a, 1
    rst 8
    .db ERAPI_Exit

_pm_clear_flash_frame:
    ;; is L down?
    ld hl, (SYS_INPUT_RAW)
    ld a, h
    and ERAPI_KEY_L
    ;; no? go reset
    jp z, _pm_clear_flash_frame__reset

    ;; is r down?
    ld a, h
    and ERAPI_KEY_R
    ;; no? go reset
    jp z, _pm_clear_flash_frame__reset

    ;; both L and R are held down
    ;; make sure the x is visible
    ld hl, (_pm_handle_clear_flash_x)
    rst 0
    .db ERAPI_SpriteShow

    ld a, (_pm_clear_flash_countdown)
    dec a
    ld (_pm_clear_flash_countdown), a
    ;; has the countdown elapsed?
    cp 0
    ;; if not yet, then nothing to do
    ret nz

    ;; countdown has elapsed
    ;; erase saved puzzles
    call flash_clear
    ;; now we need to redo the menu
    call puzzle_menu_on_stop
    call puzzle_menu_on_start

    _pm_clear_flash_frame__reset:
    ;; hide the x
    ld hl, (_pm_handle_clear_flash_x)
    rst 0
    .db ERAPI_SpriteHide
    ld a, 120
    ld (_pm_clear_flash_countdown), a
    ret
    

puzzle_menu_on_stop:
    ;; get the number of puzzles
    ld hl, scan_puzzle_buffer + PUZZLE_COLLECTION_PUZZLE_COUNT_OFFSET
    ld a, (hl)

    ;; use that as our loop counter
    ld b, a
    ld c, 0

    puzzle_menu_on_stop__loop:
    ;; hide both the real puzzle sprite and the unsolved sprite
    ;; to cover all bases
    push bc
    call puzzle_sprites_get
    pop bc
    ;; real puzzle sprite handle now in hl
    rst 0
    .db ERAPI_SpriteHide

    push bc
    ld hl, _pm_unsolved_sprite_handles
    ld b, 0
    ;; twice since handles are words
    add hl, bc
    add hl, bc
    ld c, (hl)
    inc hl
    ld b, (hl)
    push bc
    pop hl

    rst 0
    .db ERAPI_SpriteHide

    pop bc
    inc c

    djnz puzzle_menu_on_stop__loop

    ld hl, (_pm_handle_cursor)
    rst 0
    .db ERAPI_SpriteHide

    ret

_pm_set_chosen_puzzle:
    ;; calc cur index
    ;; curIndex = curY * entriesPerRow + curX
    ld hl, (_pm_cur_y)
    ld a, (_pm_entries_per_row)
    ld d, 0
    ld e, a
    rst 8
    .db ERAPI_Mul16
    ;; hl is now curY * entriesPerRow
    ld a, (_pm_cur_x)
    ld d, 0
    ld e, a
    ;; hl = curY* entriesPerRow + curX
    add hl, de

    ld a, l

    ;; first set the chosen puzzle's sprite handle
    ld c, a
    call puzzle_sprites_get
    ;; chosen puzzle's handle is now in hl
    ld (chosen_puzzle_sprite_handle), hl

    ld b, a

    ;; point hl at the first puzzle
    ld hl, scan_puzzle_buffer + PUZZLE_COLLECTION_PUZZLES_OFFSET

    ;; special case for zero, we want to bail right away
    ;; and avoid the loop
    cp 0
    jr z, _pm_set_chosen_puzzle__skip

    _pm_set_chosen_puzzle__loop:
    ;; move past puzzle's id
    inc hl
    inc hl
    ;; get the puzzle's size
    ld a, (hl)

    cp PUZZLE_SIZE_LARGE
    jr z, _pm_set_chosen_puzzle__large

    ;; this is a small or medium sized puzzle
    ;; subtracting size of id as we are currently pointed
    ;; just past the id
    ld de, PUZZLE_SIZE_OF_SMALL_MEDIUM_PUZZLE - PUZZLE_SIZE_OF_ID
    jr _pm_set_chosen_puzzle__done

    _pm_set_chosen_puzzle__large:
    ;; subtracting size of id as we are currently pointed
    ;; just past the id
    ld de, PUZZLE_SIZE_OF_LARGE_PUZZLE - PUZZLE_SIZE_OF_ID

    _pm_set_chosen_puzzle__done:
    ;; move forward to next puzzle
    add hl, de

    djnz _pm_set_chosen_puzzle__loop

    _pm_set_chosen_puzzle__skip:
    ;; hl now points at the chosen puzzle
    ;; save it
    ld (chosen_puzzle), hl

    ret

_pm_handle_left:
    ld a, (_pm_cur_x)
    cp 0
    jr z, _pm_handle_left__wrap
    dec a
    jr _pm_handle_left__done

    _pm_handle_left__wrap:
    ld a, (_pm_entries_per_row)
    dec a

    _pm_handle_left__done:
    ld (_pm_cur_x), a

    ;; this used to be a call and ret
    ;; now a jr to save a byte or two
    jr _pm_set_cur_puzzle

_pm_handle_up:
    ld a, (_pm_cur_y)
    cp 0
    jr z, _pm_handle_up__wrap
    dec a
    jr _pm_handle_up__done

    _pm_handle_up__wrap:
    ld a, (_pm_num_rows)
    dec a

    _pm_handle_up__done:
    ld (_pm_cur_y), a

    ;; this used to be a call and ret
    ;; now a jr to save a byte or two
    jr _pm_set_cur_puzzle

_pm_handle_down:
    ld a, (_pm_num_rows)
    dec a
    ld b, a
    ld a, (_pm_cur_y)
    cp b
    jr z, _pm_handle_down__wrap
    inc a
    jr _pm_handle_down__done

    _pm_handle_down__wrap:
    ld a, 0

    _pm_handle_down__done:
    ld (_pm_cur_y), a
    ;; this used to be a call and ret
    ;; now a jr to save a byte or two
    jr _pm_set_cur_puzzle

_pm_handle_right:
    ld a, (_pm_entries_per_row)
    dec a
    ld b, a
    ld a, (_pm_cur_x)
    cp b
    jr z, _pm_handle_right__wrap
    inc a
    jr _pm_handle_right__done

    _pm_handle_right__wrap:
    ld a, 0

    _pm_handle_right__done:
    ld (_pm_cur_x), a

    ;; purposely fall through

_pm_set_cur_puzzle:
    ;; hl is now yi
    ld hl, (_pm_cur_y)
    ld a, (_pm_span)
    ld d, 0
    ld e, a
    rst 8
    .db ERAPI_Mul16
    ;; hl is now yIndex*spanY
    ld a, (_pm_cursor_start_y)
    ld d, 0
    ld e, a
    add hl, de

    ;; hl is now ypx, put on stack
    push hl

    ;; hl is now xi
    ld hl, (_pm_cur_x)
    ld a, (_pm_span)
    ld d, 0
    ld e, a
    rst 8
    .db ERAPI_Mul16

    ;; hl is now xIndex*spanY
    ld a, (_pm_cursor_start_x)
    ld d, 0
    ld e, a
    add hl, de

    ;; hl is now xpx, put on stack
    push hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ;; pull x off stack
    pop de
    ;; pull y off stack
    pop bc
    ;; pull sprite handle in
    ld hl, (_pm_handle_cursor)
    rst  0
    .db  ERAPI_SetSpritePos

    ret

;; checks to see if a puzzle is solved or not
;; then based on that, either returns the puzzle's real sprite
;; (as loaded by puzzle_sprites_load), or an unsolved puzzle sprite
;;
;; parameters
;; c: the puzzle index
;; _pm_cur_puzzle_pointer: the current puzzled
;; returns
;; _pm_cur_puzzle_pointer: pointed to the next puzzle
;; hl: the sprite handle
;; a: 0 if not cleared, 1 if cleared
;; _pm_position_offset: the pixel offset for this sprite
_pm_get_puzzle_sprite_handle:
    ld hl, (_pm_cur_puzzle_pointer)
    ;; get the puzzle's size
    ;; move past the id
    inc hl
    inc hl
    ld a, (hl)
    ;; is it a large puzzle?
    cp PUZZLE_SIZE_LARGE
    jr z, _pm_get_puzzle_sprite_handle__large

    cp PUZZLE_SIZE_SMALL
    jr nz, _pm_get_puzzle_sprite_handle__medium
    ;; this is a small puzzle
    ld de, PUZZLE_SIZE_OF_SMALL_MEDIUM_PUZZLE
    ld a, 4
    jr _pm_get_puzzle_sprite_handle__size_done

    _pm_get_puzzle_sprite_handle__medium:
    ;; this is a medium puzzle
    ld de, PUZZLE_SIZE_OF_SMALL_MEDIUM_PUZZLE
    ld a, 0
    jr _pm_get_puzzle_sprite_handle__size_done


    _pm_get_puzzle_sprite_handle__large:
    ld de, PUZZLE_SIZE_OF_LARGE_PUZZLE
    ld a, 0

    _pm_get_puzzle_sprite_handle__size_done:
    ld (_pm_position_offset), a

    ;; now is this puzzle cleared?

    ;; save off de, which is the size of the puzzle in bytes
    push de

    ;; load the id, we are currently pointing just past it
    dec hl
    ld d, (hl)
    dec hl
    ld e, (hl)

    push bc
    push hl
    call flash_is_puzzle_cleared
    pop hl
    pop bc
    pop de

    cp 1
    jr z, _pm_get_puzzle_sprite_handle__cleared

    ;; this puzzle is not cleared, return an unsolved sprite handle
    ;; undo any positioning offset
    ld a, 0
    ld (_pm_position_offset), a
    ld hl, _pm_unsolved_sprite_handles
    ld b, 0
    ;; twice since handles are words
    add hl, bc
    add hl, bc
    ld c, (hl)
    inc hl
    ld b, (hl)
    ;; unsolved handle now in bc
    ;; set a's return value
    ld a, 0
    jr _pm_get_puzzle_sprite_handle__next_puzzle

    _pm_get_puzzle_sprite_handle__cleared:
    ;; this puzzle is cleared, return the real puzzle sprite handle
    call puzzle_sprites_get
    ;; sprite handle is now in hl, move to bc
    push hl
    pop bc

    ;; set a's return value
    ld a, 1

    _pm_get_puzzle_sprite_handle__next_puzzle:

    ;; now move onto the next puzzle
    ld hl, (_pm_cur_puzzle_pointer)
    add hl, de
    ld (_pm_cur_puzzle_pointer), hl

    ;; and finally set hl as our sprite handle
    push bc
    pop hl

    ret

_pm_cur_puzzle_pointer:
    .dw 0

;; by making these words, we can either load them
;; with hl or a, since z80 is little endian
_pm_puzzle_count:
    .db 0
_pm_cur_x:
    .dw 0
_pm_cur_y:
    .dw 0
_pm_num_rows:
    .db 0

    .even
_pm_tiles_unsolved_icon:
    .include "unsolved_puzzle_icon.tiles.asm"
_pm_unsolved_sprite:
    .dw _pm_tiles_unsolved_icon  ; tiles
    .dw global_palette; palette
    .db 1          ; width
    .db 1          ; height
    .db 1          ; frames
    .db 0          ; ?
    .db 0          ; hitbox width
    .db 0          ; hitbox height
    .db 1          ; total frames

    .even
_pm_tiles_clear_flash_x:
    .include "clear_flash_x.tiles.asm"
_pm_sprite_clear_flash_x:
    .dw _pm_tiles_clear_flash_x ; tiles
    .dw global_palette; palette
    .db 0x01          ; width
    .db 0x01          ; height
    .db 0x01          ; frames per bank
    .db 0x00          ; ?
    .db 0x00          ; hitbox width
    .db 0x00          ; hitbox height
    .db 0x01          ; total frames
    .even
_pm_handle_clear_flash_x:
    .dw 0
_pm_tiles_menu_cursor:
    .include "menu_cursor.tiles.asm"
_pm_sprite_menu_cursor:
    .dw _pm_tiles_menu_cursor ; tiles
    .dw global_palette; palette
    .db 0x02          ; width
    .db 0x02          ; height
    .db 0x02          ; frames per bank
    .db 0x02          ; ?
    .db 0x02          ; hitbox width
    .db 0x02          ; hitbox height
    .db 0x02          ; total frames
_pm_handle_cursor:
    .dw 0

_pm_position_offset:
    .db 0
_pm_clear_flash_countdown:
    .db 0
_pm_entries_per_row:
    .db PM_ENTRIES_PER_ROW
_pm_start_x:
    .db PM_START_X
_pm_start_y:
    .db PM_START_Y
_pm_cursor_start_x:
    .db PM_CURSOR_START_X
_pm_cursor_start_y:
    .db PM_CURSOR_START_Y
_pm_span:
    .db PM_SPAN
chosen_puzzle:
    .dw 0
chosen_puzzle_sprite_handle:
    .dw 0
_pm_unsolved_sprite_handles:
    .include '_pm_unsolved_sprite_handles.asm'