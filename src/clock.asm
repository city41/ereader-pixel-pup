CL_MINUTES_X_TILE = 11
CL_MINUTES_Y_TILE = 5
CL_SECONDS_X_TILE = CL_MINUTES_X_TILE + 3
CL_SECONDS_Y_TILE = CL_MINUTES_Y_TILE

CL_COLON_X = (CL_MINUTES_X_TILE + 3) * 8 - 4
CL_COLON_Y = CL_MINUTES_Y_TILE * 8 + 8

CL_SPRITE_ID = 4157

clock_init:
    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld  e, PALETTE_INDEX_GLOBAL
    ld  hl, _cl_sprite_colon
    rst 0
    .db ERAPI_SpriteCreate
    ld (_cl_handle_colon), hl

    ld de, CL_COLON_X
    ld bc, CL_COLON_Y
    rst 0
    .db ERAPI_SetSpritePos

    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld  e, PALETTE_INDEX_GLOBAL
    ld  hl, _cl_sprite_penalties
    rst 0
    .db ERAPI_SpriteCreate
    ld (_cl_handle_penalties), hl

    ld de, 0
    ld bc, -0x40
    rst 0
    .db ERAPI_SpriteAutoMove


    ;; init the number drawing
    ld hl, _cl_minutes_number
    ld de, 0
    rst 0
    .db ERAPI_DrawNumber

    ld hl, _cl_seconds_number
    ld de, 0
    rst 0
    .db ERAPI_DrawNumber

    jr clock_on_stop

clock_on_start:
    ;; set the penalty back to 2 minutes
    ld a, 0
    ld (_cl_penalty_index), a
    ;; and clear the empty flag
    ld (clock_empty), a

    .ifdef DEBUG
        ld hl, 5
    .else
        ;; 30 minutes
        ld hl, 30 * 60
    .endif
    ld (clock_seconds_counter), hl

    ld hl, (_cl_handle_colon)
    rst 0
    .db ERAPI_SpriteShow

    call _cl_render
    ret

clock_on_stop:
    ld hl, (_cl_handle_colon)
    rst 0
    .db ERAPI_SpriteHide

    ld  a, BG_INDEX_CLOCK
    ld  de, _cl_clear_background
    rst 0
    .db ERAPI_LoadCustomBackground

    jp clock_hide_penalty

.ifdef DEBUG
    ;; draws the value in a into the seconds
    clock_debug_a:
        ld d, 0
        ld e, a
        ld hl, _cl_seconds_number
        rst 0
        .db ERAPI_DrawNumberNewValue
        ret
.endif

clock_frame:
    ld a, (_cl_frame_counter)
    inc a
    cp 60
    jr nz, clock_frame__skip_reset_frame_counter
    ;; we've counted an entire second
    ;; decrement seconds
    ld hl, (clock_seconds_counter)
    dec hl

    ;; did hl just go negative?
    ld a, h
    and 0x80
    jr z, clock_frame__skip_negative
    ;; we have gone negative, indicate clock is done
    ld a, 1
    ld (clock_empty), a
    ;; and keep seconds counter at zero
    ld hl, 0

    clock_frame__skip_negative:
    ld (clock_seconds_counter), hl

    ;; and reset the frame counter
    ld a, 0

    clock_frame__skip_reset_frame_counter:
    ld (_cl_frame_counter), a

    call _cl_render
    ret

_cl_penalties:
    .dw -120
    .dw -240
    .dw -480

clock_penalty:
    ;; need to translate from penalty index to penalty value
    ld a, (_cl_penalty_index)
    ld d, 0
    ld e, a
    ld hl, _cl_penalties
    add hl, de
    add hl, de

    ld e, (hl)
    inc hl
    ld d, (hl)
    ;; de is now the negative penalty
    push de
    pop bc

    ld hl, (clock_seconds_counter)
    add hl, bc

    ld a, h
    and 0x80
    jr z, clock_penalty__skip_clamp
    ;; we've gone negative, clamp back up to zero
    ld hl, 0
    ;; and indicate the clock is empty
    ld a, 1
    ld (clock_empty), a

    clock_penalty__skip_clamp:
    ld (clock_seconds_counter), hl


    ;; now increase the penalty
    ld a, (_cl_penalty_index)
    ;; if we are already at 8 minutes, no increase
    cp 2
    ret z

    inc a
    ld (_cl_penalty_index), a
    ret

;; shows the penalty sprite, either -2, -4 or -8
;; at cursor x/y
clock_show_penalty:
    ;; load up x
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
    push hl

    ;; load up y
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
    ld hl, (_cl_handle_penalties)
    rst  0
    .db  ERAPI_SetSpritePos

    ;; set the frame based on what the penalty is
    ld a, (_cl_penalty_index)
    ld e, a
    rst 0
    .db ERAPI_SetSpriteFrame

    rst 0
    .db ERAPI_SpriteShow
    ret

clock_hide_penalty:
    ld hl, (_cl_handle_penalties)
    rst 0
    .db ERAPI_SpriteHide
    ret


_cl_render:
    ;; draw minutes
    ld hl, (clock_seconds_counter)
    ld de, 60
    ;; hl = hl/de
    rst 8
    .db ERAPI_Div
    ;; move number to de, where DrawNumberNewValue needs it
    push hl
    pop de
    ld hl, _cl_minutes_number
    rst 0
    .db ERAPI_DrawNumberNewValue

    ;; draw seconds
    ld hl, (clock_seconds_counter)
    ld de, 60
    ;; hl = hl%de
    rst 8
    .db ERAPI_Mod
    ;; move number to de, where DrawNumberNewValue needs it
    push hl
    pop de

    ld hl, _cl_seconds_number
    rst 0
    .db ERAPI_DrawNumberNewValue

    ret


clock_empty:
    .db 0

_cl_frame_counter:
    .db 0
.even
clock_seconds_counter:
    .dw 0
;; the index of the current penalty
;; 0 - 2 minutes
;; 1 - 4 minutes
;; 2 - 8 minutes
_cl_penalty_index:
    .db 0

    .even
_cl_minutes_number:
    .db BG_INDEX_CLOCK
    .db PALETTE_INDEX_CLOCK ; palette #
    .db CL_MINUTES_X_TILE ; x in tiles
    .db CL_MINUTES_Y_TILE ; y in tiles
    .dw CL_SPRITE_ID ; system sprite to use as the font
    .db 2 ; number of digits
    .db 0 ; number of extra zeroes on right
    .db 1 ; 0 fill with spaces, 1 fill with zeroes
    .db 0 ; loaded sprite?
    .dw 0 ; value

    .even
_cl_seconds_number:
    .db BG_INDEX_CLOCK
    .db PALETTE_INDEX_CLOCK ; palette #
    .db CL_SECONDS_X_TILE ; x in tiles
    .db CL_SECONDS_Y_TILE ; y in tiles
_cl_seconds_number_sprite_id:
    .dw CL_SPRITE_ID ; system sprite to use as the font
    .db 2 ; number of digits
    .db 0 ; number of extra zeroes on right
    .db 1 ; 0 fill with spaces, 1 fill with zeroes
    .db 0 ; loaded sprite?
    .dw 0 ; value

    .even
_cl_tiles_colon:
    .include "clock_colon.tiles.asm"
_cl_sprite_colon:
    .dw _cl_tiles_colon  ; tiles
    .dw global_palette; palette
    .db 0x01          ; width
    .db 0x01          ; height
    .db 0x01          ; frames per bank
    .db 0x01          ; ?
    .db 0x01          ; hitbox width
    .db 0x01          ; hitbox height
    .db 0x01          ; total frames
_cl_handle_colon:
    .dw 0

    .even
_cl_tiles_penalties:
    .include "penalties.tiles.asm"
_cl_sprite_penalties:
    .dw _cl_tiles_penalties  ; tiles
    .dw global_palette; palette
    .db 0x01          ; width
    .db 0x01          ; height
    .db 0x03          ; frames per bank
    .db 0x03          ; ?
    .db 0x03          ; hitbox width
    .db 0x03          ; hitbox height
    .db 0x03          ; total frames
_cl_handle_penalties:
    .dw 0

_cl_clear_background:
    .dw 0
    .dw global_palette
    .dw _cl_clear_map
    .dw 0 / 0x20   ; number of tiles
    .dw 1 ;; number of palettes, due to palette trimming, this needs to be hard coded

    .even
_cl_clear_map:
    .include '_cl_clear_map.asm'