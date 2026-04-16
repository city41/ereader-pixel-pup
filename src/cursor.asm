    _C_BOARD_X = BOARD_GRID_X_TILES * 8 + 4
    _C_BOARD_Y = BOARD_GRID_Y_TILES * 8 + 4

cursor_init:
    ;; CURSOR
    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld e, PALETTE_INDEX_GLOBAL
    ld hl, _c_sprite_cursor
    rst 0
    .db ERAPI_SpriteCreate
    ld (_c_sprite_handle), hl

    ret

cursor_show:
    ld hl, (_c_sprite_handle)
    rst 0
    .db ERAPI_SpriteShow
    call cursor_render
    ret

cursor_hide:
    ld hl, (_c_sprite_handle)
    rst 0
    .db ERAPI_SpriteHide
    ret

cursor_lrud:
    ld hl, (input_repeat_pressed)
    ld a, l
    and ERAPI_KEY_LEFT
    jr z, cursor_lrud__skip_left

    ;; LEFT
    ld a, (cursor_board_x)
    ld (cursor_board_last_x), a
    ;; already all the way left?
    cp 0
    ;; if so, nothing to do
    jr z, cursor_lrud__not_moving
    dec a
    ld (cursor_board_x), a
    jr cursor_lrud__moving

    cursor_lrud__skip_left:
    ld a, l
    and ERAPI_KEY_RIGHT
    jr z, cursor_lrud__skip_right

    ;; RIGHT
    ld a, (_b_cur_size_tile)
    dec a
    ld b, a

    ;; now get current x into a
    ld a, (cursor_board_x)
    ld (cursor_board_last_x), a

    ;; are we all the way right already?
    cp b
    ;; if so, nothing to do
    jr z, cursor_lrud__not_moving

    inc a
    ld (cursor_board_x), a
    jr cursor_lrud__moving


    cursor_lrud__skip_right:
    ld a, l
    and ERAPI_KEY_UP
    jr z, cursor_lrud__skip_up

    ;; UP
    ld a, (cursor_board_y)
    ld (cursor_board_last_y), a
    ;; already all the way up?
    cp 0
    ;; if so, nothing to do
    jr z, cursor_lrud__not_moving

    dec a
    ld (cursor_board_y), a
    jr cursor_lrud__moving


    cursor_lrud__skip_up:
    ld a, l
    and ERAPI_KEY_DOWN
    jr z, cursor_lrud__not_moving

    ;; DOWN
    ;; get how tall this puzzle is into b
    ld a, (_b_cur_size_tile)
    dec a
    ld b, a

    ;; now get current y into a
    ld a, (cursor_board_y)
    ld (cursor_board_last_y), a

    ;; are we all the way down already?
    cp b
    ;; if so, nothing to do
    jr z, cursor_lrud__not_moving

    inc a
    ld (cursor_board_y), a
    jr cursor_lrud__moving

    cursor_lrud__not_moving:
    ld a, 0
    ret
    cursor_lrud__moving:
    ld a, 1
    ret

cursor_render:
    ;; load up cursor x
    ld a, (cursor_board_x)
    ld d, 0
    ld e, a
    ld hl, BOARD_TILE_SIZE_PX
    rst 8
    ;; hl = hl*de
    .db ERAPI_Mul16
    ;; now offset x into the board
    ld bc, _C_BOARD_X + 2
    add hl, bc
    ;; save tile x to the stack
    push hl

    ;; load up cursor y
    ld a, (cursor_board_y)
    ld d, 0
    ld e, a
    ld hl, BOARD_TILE_SIZE_PX
    rst 8
    ;; hl = hl*de
    .db ERAPI_Mul16
    ;; now offset y into the board
    ld bc, _C_BOARD_Y + 2
    add hl, bc
    ;; save tile y to the stack
    push hl

    ;; load tile y where ERAPI needs it
    pop bc
    ;; load tile x where ERAPI needs it
    pop de

    ; move the cursor
    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld hl, (_c_sprite_handle)
    rst  0
    .db  ERAPI_SetSpritePos
    rst 0
    .db ERAPI_SpriteShow

    ret

    .even
_c_tiles_cursor:
    .include "cursor.tiles.asm"
_c_sprite_cursor:
    .dw _c_tiles_cursor  ; tiles
    .dw global_palette; palette
    .db 0x01          ; width
    .db 0x01          ; height
    .db 0x01          ; frames per bank
    .db 0x01          ; ?
    .db 0x01          ; hitbox width
    .db 0x01          ; hitbox height
    .db 0x01          ; total frames

    .even
_c_sprite_handle:
    .dw 0

cursor_board_x:
    .db 0
cursor_board_y:
    .db 0
cursor_board_last_x:
    .db 0
cursor_board_last_y:
    .db 0