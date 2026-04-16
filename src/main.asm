    .area CODE (ABS)
    .org 0x100

    rst 8
    .db ERAPI_SuppressStartPauseScreen

    ld a, 0
    rst 0
    .db ERAPI_SetBackgroundMode

    ; ERAPI_SetBackgroundPalette()
    ; hl = pointer to palette data
    ; d = palette index
    ; e = offset within palette
    ; c  = number of colors
    ld c, 16
    ld d, PALETTE_INDEX_GLOBAL
    ld e, 0
    ld hl, global_palette
    rst 0
    .db ERAPI_SetBackgroundPalette

    ; ERAPI_LoadSystemBackground()
    ; a = index (1-101)
    ; e = bg# (0-3)
    ld a, 12
    ld e, BG_INDEX_SYSTEM_BG
    rst 0
    .db ERAPI_LoadSystemBackground

    ld a, BG_INDEX_SYSTEM_BG
    ld de, 80
    ld bc, 0
    rst 0
    .db ERAPI_SetBackgroundAutoScroll


    ; ERAPI_FadeIn()
    ; a = number of frames
    xor a
    rst 0
    .db ERAPI_FadeIn

    call scan_init
    call cursor_init
    call flash_init
    call hints_init
    call game_init

scan_loop:
    call scan_frame

    cp 1
    jr z, _scan_done

    ld a, 1
    halt
    jr scan_loop

_scan_done:
    ld a, 30
    rst 0
    .db ERAPI_FadeOut
    halt

    call game_load_mascot
    call puzzle_sprites_load
    call puzzle_menu_init

    ld hl, scan_puzzle_buffer + PUZZLE_COLLECTION_BG_ID_OFFSET

    ; ERAPI_LoadSystemBackground()
    ; a = index (1-101)
    ; e = bg# (0-3)
    ld a, (hl)
    ld e, BG_INDEX_SYSTEM_BG
    rst 0
    .db ERAPI_LoadSystemBackground

    ;; stop auto scrolling as now we have the card's bg
    ld a, BG_INDEX_SYSTEM_BG
    ld de, 0
    ld bc, 0
    rst 0
    .db ERAPI_SetBackgroundAutoScroll

    ;; and reset the offsets back to zero so the
    ;; pack bg is not unexpectedly shifted
    rst 0
    .db ERAPI_SetBackgroundOffset



    call main_execute_collection_function


main_after_scan_start:

    call puzzle_menu_on_start

    ld a, 30
    rst 0
    .db ERAPI_FadeIn

puzzle_menu_loop:
    ld a, 1
    halt

    call puzzle_menu_frame
    cp 0
    jr z, puzzle_menu_loop

puzzle_menu_loop__done:
    call puzzle_menu_on_stop
    ; ld a, 30
    ; rst 0
    ; .db ERAPI_FadeIn
    ld a, 10
    halt
    call game_on_start

game_loop:
    ld a, 1
    halt

    call game_frame

    jr game_loop

main_jp_hl:
    jp (hl)

main_execute_collection_function:
    ld hl, scan_puzzle_buffer + PUZZLE_COLLECTION_FUNCTION_POINTER_OFFSET
    ld e, (hl)
    inc hl
    ld d, (hl)

    ld a, e
    cp 0
    ;; since e is not zero, this can't be null
    jr nz, main_execute_collection_function__not_null

    ld a, d
    cp 0
    ;; the entire pointer is null, no function to call
    ret z

    main_execute_collection_function__not_null:
    ;; we have a real function pointer
    push de
    pop hl
    call main_jp_hl
    ret

main_reset:
    call game_on_stop
    ld a, 30
    rst 0
    .db ERAPI_FadeOut
    halt
    jp main_after_scan_start


    .include "common/erapi.asm"
    .even
    .include "scan.asm"
    .even
    .include "puzzle_menu.asm"
    .even
    .include "game.asm"
    .even
    .include "board.asm"
    .even
    .include "calc_hint_numbers.asm"
    .even
    .include "numbers.asm"
    .even
    .include "cursor.asm"
    .even
    .include "sound.asm"
    .even
    .include "clock.asm"
    .even
    .include "puzzle_cell_manager.asm"

    .even
    .include "common/input.asm"
    .even
    .include "repeat_input.asm"
    .even
    .include "global_palette.asm"
    .even
    .include "game_won.asm"
    .even
    .include "flash.asm"
    .even
    .include "hints.asm"
    .even
    .include "puzzle_sprites.asm"

    .include "palette_indexes.asm"
    .include "bg_indexes.asm"
    .include "puzzle_collection_struct.asm"
    .include "puzzle_struct.asm"
    ;; it is important that this is last
    ;; as this is the only place EJ and US really differ
    ;; this is key to keep scan_puzzle_buffer in the same
    ;; place for both EJ and US
    .even
    .include "ej_string.asm"