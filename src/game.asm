_G_MASCOT_X = 52
_G_MASCOT_Y = 114
_G_MASCOT_TAIL_DIFF_X = 17
_G_MASCOT_TAIL_X = _G_MASCOT_X - _G_MASCOT_TAIL_DIFF_X
_G_MASCOT_TAIL_Y = _G_MASCOT_Y + 15
_G_MASCOT_SAD_FACE_DIFF_X = - 9
_G_MASCOT_SAD_FACE_X = _G_MASCOT_X - _G_MASCOT_SAD_FACE_DIFF_X
_G_MASCOT_SAD_FACE_Y = _G_MASCOT_Y - 5

_G_PAUSED_COUNTDOWN_DURATION = 120

game_init:
    call board_init
    call numbers_init
    call clock_init
    call game_won_init

    ; ERAPI_CreateSystemSprite()
    ; de  = sprite id
    ld de, 4150
    ld a, PALETTE_INDEX_GAME_OVER
    rst 0
    .db ERAPI_CreateSystemSprite
    ld (_g_game_over_handle), hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, 64
    ld bc, 26
    rst  0
    .db  ERAPI_SetSpritePos

    rst 0
    .db ERAPI_SpriteHide
    ret

game_on_start:
    ld a, 0
    ld (_g_is_paused), a
    ;; just reseting cursor here as it is cheap
    ld (cursor_board_x), a
    ld (cursor_board_y), a
    ld (cursor_board_last_x), a
    ld (cursor_board_last_y), a

    call game_happy_mascot
    call _g_show_mascot

    call board_load_puzzle
    call _b_draw_frame
    call calc_hint_numbers_calculate

    ld a, (_b_cur_size_tile)
    ld b, a
    ld c, 0

    call sound_play_board_load_swipe_sfx

    game_on_start__draw_board_loop:
    ld a, 3
    halt

    push bc
    call numbers_draw_top_at
    pop bc
    push bc
    call numbers_draw_left_at
    pop bc
    push bc
    ld e, B_REGULAR_LINE_COLOR
    call board_draw_vertical_line_at
    pop bc
    push bc
    ld e, B_REGULAR_LINE_COLOR
    call board_draw_horizontal_line_at
    pop bc

    inc c
    djnz game_on_start__draw_board_loop
    
    call _b_draw_boundary_lines

    ld a, 30
    halt

    call clock_on_start
    call hints_on_start

    ld a, 10
    halt

    call sound_play_ready_sfx
    ld a, 60
    halt
    call sound_play_go_sfx
    ld a, 20
    halt

game_on_start__sound_play_bgm:
    call sound_play_bgm

    ld a, 0

    call cursor_render

    ret

game_on_stop:
    call sound_stop_bgm
    call _g_hide_mascot
    call cursor_hide
    call clock_on_stop
    call board_on_stop
    call numbers_on_stop
    call clock_on_stop
    call hints_on_stop
    call game_won_on_stop

    ret

game_sad_mascot:
    ld hl, (_g_mascot_sad_face_sprite_handle)
    rst 0
    .db ERAPI_SpriteShow

    ;; stop the tail from wagging
    ld hl, (_g_mascot_tail_sprite_handle)
    ;; hl = sprite handle
    ;; de = sprite frame duration in system frames
    ;; bc =
    ;; bc: 0 = Start Animating Forever
    ;;     1 = Stop Animation
    ;;     2 > Number of frames to animate for -2 (ex. 12 animates for 10 frames)
    ld bc, 1
    rst 0
    .db ERAPI_SpriteAutoAnimate

    ;; and put it back to frame zero
    ld e, 0
    rst 0
    .db ERAPI_SetSpriteFrame
    ret

game_happy_mascot:
    ld hl, (_g_mascot_sad_face_sprite_handle)
    rst 0
    .db ERAPI_SpriteHide

    ;; start the tail wagging
    ld hl, (_g_mascot_tail_sprite_handle)
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

_g_hide_mascot:
    ld hl, (_g_mascot_body_sprite_handle)
    rst 0
    .db ERAPI_SpriteHide

    ld hl, (_g_mascot_tail_sprite_handle)
    rst 0
    .db ERAPI_SpriteHide

    ld hl, (_g_mascot_sad_face_sprite_handle)
    rst 0
    .db ERAPI_SpriteHide
    ret

_g_show_mascot:
    ld hl, (_g_mascot_body_sprite_handle)
    rst 0
    .db ERAPI_SpriteShow

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, -100
    ld bc, _G_MASCOT_Y
    rst  0
    .db  ERAPI_SetSpritePos

    ;; how fast the mascot will scroll in
    ld bc, 500
    push bc

    ; ERAPI_SetSpritePosAnimatedSpeed()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, _G_MASCOT_X
    ld bc, _G_MASCOT_Y
    rst  0
    .db  ERAPI_SetSpritePosAnimatedSpeed



    ld hl, (_g_mascot_tail_sprite_handle)
    rst 0
    .db ERAPI_SpriteShow

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, -100 - _G_MASCOT_TAIL_DIFF_X
    ld bc, _G_MASCOT_TAIL_Y
    rst  0
    .db  ERAPI_SetSpritePos

    ; ERAPI_SetSpritePosAnimatedSpeed()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, _G_MASCOT_TAIL_X
    ld bc, _G_MASCOT_TAIL_Y
    rst  0
    .db  ERAPI_SetSpritePosAnimatedSpeed

    ld hl, (_g_mascot_sad_face_sprite_handle)
    rst 0
    .db ERAPI_SpriteHide

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, -100 - _G_MASCOT_SAD_FACE_DIFF_X
    ld bc, _G_MASCOT_SAD_FACE_Y
    rst  0
    .db  ERAPI_SetSpritePos

    ; ERAPI_SetSpritePosAnimatedSpeed()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, _G_MASCOT_SAD_FACE_X
    ld bc, _G_MASCOT_SAD_FACE_Y
    rst  0
    .db  ERAPI_SetSpritePosAnimatedSpeed

    pop bc
    ret

game_load_mascot:
    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld  e, PALETTE_INDEX_PUZZLE_PACK
    ld  hl, _g_mascot_body_sprite
    rst 0
    .db ERAPI_SpriteCreate
    ld  (_g_mascot_body_sprite_handle), hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, _G_MASCOT_X
    ld bc, _G_MASCOT_Y
    rst  0
    .db  ERAPI_SetSpritePos

    ld de, 0x80
    ld c, 0
    rst 0
    .db ERAPI_SpriteAutoScaleUntilSize

    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld  e, PALETTE_INDEX_PUZZLE_PACK
    ld  hl, _g_mascot_tail_sprite
    rst 0
    .db ERAPI_SpriteCreate
    ld  (_g_mascot_tail_sprite_handle), hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, _G_MASCOT_TAIL_X
    ld bc, _G_MASCOT_TAIL_Y
    rst  0
    .db  ERAPI_SetSpritePos

    ld de, 0x80
    ld c, 0
    rst 0
    .db ERAPI_SpriteAutoScaleUntilSize

    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld  e, PALETTE_INDEX_PUZZLE_PACK
    ld  hl, _g_mascot_sad_face_sprite
    rst 0
    .db ERAPI_SpriteCreate
    ld  (_g_mascot_sad_face_sprite_handle), hl

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, _G_MASCOT_SAD_FACE_X
    ld bc, _G_MASCOT_SAD_FACE_Y
    rst  0
    .db  ERAPI_SetSpritePos

    ld de, 0x80
    ld c, 0
    rst 0
    .db ERAPI_SpriteAutoScaleUntilSize

    call _g_hide_mascot

    ret

_g_is_paused:
    .db 0

_g_toggle_pause:
    ld a, (_g_is_paused)
    cp 0
    jr z, _g_toggle_pause__do_pause
    ;; game is currently paused, so unpause
    call cursor_show
    call numbers_on_unpause
_g_toggle_pause__resume_bgm:
    call sound_resume_bgm
    ld a, 0
    ld (_g_is_paused), a
    ret

    _g_toggle_pause__do_pause:
    ;; game is currently running, so pause
    call cursor_hide
    call numbers_on_pause
    call sound_stop_bgm

    ld a, 1
    ld (_g_is_paused), a
    ret

game_frame:
    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_START
    jr z, game_frame__skip_toggle_pause
    call _g_toggle_pause
    ret
    game_frame__skip_toggle_pause:

    ld a, (_g_is_paused)
    cp 1
    ;; game is still paused, so bail
    ret z

    call clock_frame


    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_SELECT
    jp nz, main_reset

    
    ld hl, (SYS_INPUT_JUST)
    ld a, h
    and ERAPI_KEY_L
game_frame__sound_toggle_bgm:
    call nz, sound_toggle_bgm

    ld hl, (SYS_INPUT_JUST)
    ld a, h
    and ERAPI_KEY_R
    jr z, game_frame__skip_hint
    call hints_use
    call cursor_render
    call numbers_render_changed
    ret

    game_frame__skip_hint:
    call repeat_input_read

    ;; for repeated inputs, make sure we didn't just win or lose the game
    call board_check_win
    ;; if zero, they didn't
    cp 0
    ;; non zero? then they won
    jp nz, game_won_run

    ;; has the clock hit zero? if so, it's game over
    ld a, (clock_empty)
    cp 1
    jp z, _g_game_over

    ld hl, (input_repeat_pressed)
    ld a, l
    and ERAPI_KEY_LRUD
    jp z, game_frame__skip_lrud
    call _g_handle_lrud
    ret

    game_frame__skip_lrud:

    ;; if the player is holding down a button, then we should
    ;; not honor just inputs
    ld hl, (SYS_INPUT_RAW)
    ld a, l

    ;; make sure we are only examining A and B
    and ERAPI_KEY_A_B
    ld b, a

    ld hl, (SYS_INPUT_JUST)
    ld a, l 
    and ERAPI_KEY_A_B
    cp b
    ;; if just and raw are different, that means a button is being held down
    ;; if they are the same, then just a newly pressed button happened this frame
    ret nz
    
    and ERAPI_KEY_A
    call nz, board_handle_black_out_request

    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_B
    call nz, board_handle_x_out_request

    call board_check_win
    ;; if zero, they didn't
    cp 0
    ;; non zero? then they won
    jp nz, game_won_run

    ;; has the clock hit zero? if so, it's game over
    ld a, (clock_empty)
    cp 1
    jp z, _g_game_over

    ret

_g_game_over:
    call clock_frame
    call cursor_hide
    call game_sad_mascot
    call sound_stop_bgm

    ;; show the game over sprite
    ld hl, (_g_game_over_handle)
    rst 0
    .db ERAPI_SpriteShow

_g_game_over__call_jingle:
    call sound_play_game_over_jingle

    ;; wait for the jingle to end
    ld a, 30
    halt

    ;; now look for a to be pressed to start over
    _g_game_over__wait_for_a:
    ld a, 1
    halt
    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_A
    jr z, _g_game_over__wait_for_a

    ;; a was pressed, time to start over

    ;; remove the game over sprite
    ld hl, (_g_game_over_handle)
    rst 0
    .db ERAPI_SpriteHide

    jp main_reset

_g_handle_lrud:
    ;; a=1 if the cursor actually moved
    call cursor_lrud
    cp 0
    ret z

    call cursor_render
    call numbers_render_changed
    call sound_play_cursor_move_sfx

    ;; now is A or B held down? if so, impact the tile we just moved to
    ld hl, (SYS_INPUT_RAW)
    ld a, l
    and ERAPI_KEY_A_B
    ret z
    call board_do_repeat
    ret

_g_paused_b_countdown:
    .db 0
    .even
_g_game_over_handle:
    .dw 0
_g_mascot_body_sprite_handle:
    .dw 0
_g_mascot_body_sprite:
    .dw scan_puzzle_buffer + PUZZLE_COLLECTION_MASCOT_BODY_OFFSET ; tiles
    .dw scan_puzzle_buffer + PUZZLE_COLLECTION_PALETTE_OFFSET ; palette
    .db 0x03          ; width
    .db 0x03          ; height
    .db 0x01          ; frames
    .db 0x02          ; ?
    .db 0x00          ; hitbox width
    .db 0x00          ; hitbox height
    .db 0x01          ; total frames

    .even
_g_mascot_tail_sprite_handle:
    .dw 0
_g_mascot_tail_sprite:
    .dw scan_puzzle_buffer + PUZZLE_COLLECTION_MASCOT_TAIL_OFFSET ; tiles
    .dw scan_puzzle_buffer + PUZZLE_COLLECTION_PALETTE_OFFSET ; palette
    .db 0x01          ; width
    .db 0x01          ; height
    .db 0x02          ; frames
    .db 0x02          ; ?
    .db 0x00          ; hitbox width
    .db 0x00          ; hitbox height
    .db 0x02          ; total frames

    .even
_g_mascot_sad_face_sprite_handle:
    .dw 0
_g_mascot_sad_face_sprite:
    .dw scan_puzzle_buffer + PUZZLE_COLLECTION_MASCOT_SAD_FACE_OFFSET ; tiles
    .dw scan_puzzle_buffer + PUZZLE_COLLECTION_PALETTE_OFFSET ; palette
    .db 0x01          ; width
    .db 0x01          ; height
    .db 0x01          ; frames
    .db 0x02          ; ?
    .db 0x00          ; hitbox width
    .db 0x00          ; hitbox height
    .db 0x01          ; total frames
