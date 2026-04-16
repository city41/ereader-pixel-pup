sound_play_bgm:
    ;; if the user has turned the bgm off, keep it off
    ld a, (_s_bgm_playing)
    cp 0
    ret z

    ld hl, (scan_puzzle_buffer + PUZZLE_COLLECTION_BGM_ID_OFFSET)
    ld e, 140
    rst 8
    .db ERAPI_PlaySystemSoundAtVolume
    ret

sound_play_tile_x_out_sfx:
    ld hl, 171
    ld e, 150
    rst 8
    .db ERAPI_PlaySystemSoundAtVolume
    ret

sound_resume_bgm:
    ;; if the user has turned the bgm off, keep it off
    ld a, (_s_bgm_playing)
    cp 0
    ret z

    ld hl, (scan_puzzle_buffer + PUZZLE_COLLECTION_BGM_ID_OFFSET)
    rst 8
    .db ERAPI_ResumeSound

    ret


sound_stop_bgm:
    ld hl, (scan_puzzle_buffer + PUZZLE_COLLECTION_BGM_ID_OFFSET)
    rst 8
    .db ERAPI_PauseSound
    ret

sound_toggle_bgm:
    ld a, (_s_bgm_playing)
    cp 1
    jr z, sound_toggle_bgm__stop
    ld a, 1
    ld (_s_bgm_playing), a
    call sound_resume_bgm
    ret

    sound_toggle_bgm__stop:
    ld a, 0
    ld (_s_bgm_playing), a
    call sound_stop_bgm
    ret

sound_play_cursor_move_sfx:
    ld hl, 24
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_tile_black_out_sfx:
    ld hl, 32
    rst 8
    .db ERAPI_PlaySystemSound
    ret


sound_play_tile_mistake_sfx:
    ; 80, 15, 33, 50, 96, 97
    ld hl, 15
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_tile_clear_sfx:
    ;; 14, 33, 51, 71
    ld hl, 71
    ld e, 120
    rst 8
    .db ERAPI_PlaySystemSoundAtVolume
    ret

sound_play_hint_sfx:
    ld hl, 56
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_game_over_jingle:
    ld hl, 192
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_win_sfx:
    ld hl, 191
    ; ld hl, 199
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_ready_to_scan_sfx:
    ld hl, 11
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_puzzle_chosen_sfx:
sound_play_scan_success_sfx:
    ld hl, 3
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_scan_error_sfx:
    ld hl, 4
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_board_load_swipe_sfx:
    ;; 36-38, fast cars
    ; ld hl, 42 ; drawn out explosion
    ; ld hl, 27 ;; laser crescendo
    ; ld hl, 755 ;; drum roll
    ; ld hl, 20  ;; falling
    ; ld hl, 123  ;; crescendo up
    ; ld hl, 36
    ld hl, 33
    ; ld hl, 142  ;; trombone up
    ; ld hl, 200   ;; female ready
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_board_boundary_reveal_sfx:
    ld hl, 75
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_ready_sfx:
    ld hl, 200  ;; female ready
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_go_sfx:
    ld hl, 201  ;; female go
    rst 8
    .db ERAPI_PlaySystemSound
    ret

sound_play_finish_sfx:
    ld hl, 202  ;; female finish
    rst 8
    .db ERAPI_PlaySystemSound
    ret

_s_bgm_playing:
    .db 1