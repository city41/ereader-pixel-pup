GW_CLEAR_X = BOARD_GRID_X_TILES * 8 + BOARD_GRID_MAX_SIZE_PX / 2
GW_CLEAR_Y = BOARD_GRID_Y_TILES * 8 + 16

GW_PUZZLE_SPRITE_X = BOARD_GRID_X_TILES * 8 + BOARD_GRID_MAX_SIZE_PX / 2
GW_PUZZLE_SPRITE_Y = BOARD_GRID_Y_TILES * 8 + 56
GW_PUZZLE_SPRITE_X_SMALL = GW_PUZZLE_SPRITE_X + 7
GW_PUZZLE_SPRITE_Y_SMALL = GW_PUZZLE_SPRITE_Y + 2

game_won_init:
    ;; load the complete sprite
    ; ERAPI_CreateSystemSprite()
    ; de  = sprite id
    ld de, 4304 ; CLEAR
    ld a, PALETTE_INDEX_GAME_WON
    rst 0
    .db ERAPI_CreateSystemSprite
    ld (_gw_clear_sprite_handle), hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, GW_CLEAR_X
    ld bc, GW_CLEAR_Y
    rst  0
    .db  ERAPI_SetSpritePos

    rst 0
    .db ERAPI_SpriteHide

    ret

game_won_on_stop:
    ld hl, (_gw_clear_sprite_handle)
    rst 0
    .db ERAPI_SpriteHide

    ld hl, (chosen_puzzle_sprite_handle)
    rst 0
    .db ERAPI_SpriteHide

    ret

game_won_run:
    ;; just incase the mascot is currently sad
    call game_happy_mascot
    call sound_stop_bgm
    call cursor_hide
    ;; the board will wipe out any x's the user placed
    ;; so they can see their finished puzzle better
    call board_clear_xes
    call board_clear_boundary_lines

    call sound_play_finish_sfx
    ld a, 80
    halt

    ld hl, (chosen_puzzle)
    ;; get the puzzle id
    ld e, (hl)
    inc hl
    ld d, (hl)
    call flash_set_puzzle_cleared


    ld a, (_b_handle_region)
    ld d, 0
    ld e, GLOBAL_PALETTE_LIGHT_GREY
    rst 0
    .db ERAPI_SetRegionColor

    rst 0
    .db ERAPI_ClearRegion


    ld hl, (_gw_clear_sprite_handle)
    rst 0
    .db ERAPI_SpriteShow

    ld hl, (chosen_puzzle)
    ld de, PUZZLE_SIZE_OFFSET
    add hl, de
    ;; load puzzle size into a
    ld a, (hl)
    cp PUZZLE_SIZE_LARGE
    jr z, game_won_run__scale_large
    ;; this is a small/medium puzzle, scale x3
    ld de, 0x40
    jr game_won_run__scale_done
    game_won_run__scale_large:
    ;; this is a large puzzle, scale x2
    ld de, 0x80
    game_won_run__scale_done:
    ld c, 0
    ld hl, (chosen_puzzle_sprite_handle)
    rst 0
    .db ERAPI_SpriteAutoScaleUntilSize

    ; is this a small puzzle? it needs different
    ; positioning to be centered better
    cp PUZZLE_SIZE_SMALL
    jr nz, game_won_run__skip_small
    ld de, GW_PUZZLE_SPRITE_X_SMALL
    ld bc, GW_PUZZLE_SPRITE_Y_SMALL
    jr game_won_run__position_ready

    game_won_run__skip_small:
    ld de, GW_PUZZLE_SPRITE_X
    ld bc, GW_PUZZLE_SPRITE_Y

    game_won_run__position_ready:
    rst  0
    .db  ERAPI_SetSpritePos

    rst 0
    .db ERAPI_SpriteShow


    ;; now display the puzzle name

    ld a, (_b_handle_region)
    ld d, 0
    ld e, GLOBAL_PALETTE_BLACK
    rst 0
    .db ERAPI_SetRegionColor

    ld b, 1
    ld e, BOARD_GRID_MAX_SIZE_PX - 18
    ld d, BOARD_GRID_MAX_SIZE_PX
    ld c, BOARD_GRID_MAX_SIZE_PX - 1
    ld h, a
    ld l, 1
    rst 0
    .db ERAPI_DrawRect

    ;; now draw the border rect
    ld b, 0
    ld e, 0
    ld d, BOARD_GRID_MAX_SIZE_PX -1
    ld c, BOARD_GRID_MAX_SIZE_PX - 1
    ld l, 0
    rst 0
    .db ERAPI_DrawRect

    ld d, GLOBAL_PALETTE_WHITE
    ld e, GLOBAL_PALETTE_BLACK
    rst 0
    .db ERAPI_SetTextColor

    ld hl, (chosen_puzzle)
    ld bc, PUZZLE_NAME_OFFSET
    add hl, bc
    push hl
    pop bc
    call ej_string

    call _gw_center_name
    ld e, BOARD_GRID_MAX_SIZE_PX - 13
    ld a, (_b_handle_region)
    rst 0
    .db ERAPI_DrawText

    call sound_play_win_sfx

    ;; wait for the jingle to end
    ld a, 30
    halt

    ;; now look for a to be pressed to start over
    jp _g_game_over__wait_for_a

;; given the name of the puzzle in bc:
;; - measures the size of this string in pixels
;; - returns in d the x offset so this string gets centered
_gw_center_name:
    push bc

    push bc
    pop de
    rst 0
    .db ERAPI_GetTextWidth
    ld b, a
    ld a, BOARD_GRID_MAX_SIZE_PX
    sub b

    ld h, 0
    ld l, a
    ld de, 2
    rst 8
    .db ERAPI_Div

    ld d, l

    pop bc
    ret

    .even
_gw_clear_sprite_handle:
    .dw 0