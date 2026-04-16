    _H_X = BOARD_GRID_X_TILES * 8 - 48
    _H_Y = BOARD_GRID_Y_TILES * 8 - 8

hints_init:
    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld e, PALETTE_INDEX_GLOBAL
    ld hl, _h_sprite_hint_icon
    rst 0
    .db ERAPI_SpriteCreate
    ld (_h_handle_hint_icon), hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, _H_X
    ld bc, _H_Y
    rst  0
    .db  ERAPI_SetSpritePos

    ;; fall through on purpose

hints_on_stop:
    ld hl, (_h_handle_hint_icon)
    rst 0
    .db ERAPI_SpriteHide
    ret

hints_on_start:
    ld a, 1
    ld (_h_count), a

    ld hl, (_h_handle_hint_icon)
    rst 0
    .db ERAPI_SpriteShow

    ld e, a
    rst 0
    .db ERAPI_SetSpriteFrame

    ret


hints_use:
    ;; no hints left?
    ld a, (_h_count)
    cp 0
    ;; then bail
    ret z

    ;; use up a hint
    dec a
    ld (_h_count), a

    ld e, a
    ld hl, (_h_handle_hint_icon)
    rst 0
    .db ERAPI_SetSpriteFrame

    ;; now do the actual hint(s)

    ;; loop based on puzzle size
    ld hl, (chosen_puzzle)
    ;; move past id
    inc hl
    inc hl
    ld a, (hl)
    inc a

    ld b, a
    hints_use__loop:
    push bc
    call board_do_hint
    call cursor_render
    call numbers_render_changed
    call sound_play_hint_sfx

    ld a, 30
    halt

    ;; now they might have won with this hint
    call board_check_win
    ;; if zero, they didn't
    cp 0
    ;; non zero? then they won
    jp nz, game_won_run

    pop bc
    djnz hints_use__loop

    ret


_h_count:
    .db 0

    .even
_h_tiles_hint_icon:
    .include "hint_icon.tiles.asm"
_h_sprite_hint_icon:
    .dw _h_tiles_hint_icon  ; tiles
    .dw global_palette; palette
    .db 0x01          ; width
    .db 0x01          ; height
    .db 0x01          ; frames per bank
    .db 0x01          ; ?
    .db 0x01          ; hitbox width
    .db 0x01          ; hitbox height
    .db 0x01          ; total frames

    .even
_h_handle_hint_icon:
    .dw 0