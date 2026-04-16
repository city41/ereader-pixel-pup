.include "/home/matt/dev/ereaderz80/src/common/erapi.asm"
.include "/home/matt/dev/ereaderz80/src/common/input.asm"
.include "/home/matt/dev/ereaderz80/src/common/achievement_constants.asm"
.include "/home/matt/dev/ereaderz80/src/nonogram/palette_indexes.asm"
.include "/home/matt/dev/ereaderz80/src/nonogram/bg_indexes.asm"

entomology1_func:
    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld e, 12
    ld hl, _ent1_sprite_spider
    rst 0
    .db ERAPI_SpriteCreate
    ld (_ent_spider_handle), hl

    ;; hl = sprite handle
    ;; de = sprite frame duration in system frames
    ;; bc =
    ;; bc: 0 = Start Animating Forever
    ;;     1 = Stop Animation
    ;;     2 > Number of frames to animate for -2 (ex. 12 animates for 10 frames)
    ld de, 90
    ld bc, 0
    rst 0
    .db ERAPI_SpriteAutoAnimate

    ld e, PALETTE_INDEX_GLOBAL
    rst 0
    .db ERAPI_SetSpritePaletteIndex

    ;; randomly set spider starting y to randomize
    ;; how long it takes for it to show up
    rst 8
    .db ERAPI_Rand
    ld h, 0
    ld l, 18
    add a, l ; a is now 18->273
    ld l, a
    ld de, -1
    ;; hl=hl*de
    rst 8
    .db ERAPI_Mul16
    push hl
    pop bc


    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld hl, (_ent_spider_handle)
    ld de, 240 - 22
    rst  0
    .db  ERAPI_SetSpritePos

    ;; speed for the movement on stack
    ld bc, 30
    push bc

    ; ERAPI_SetSpritePosAnimatedSpeed()
    ; hl = handle
    ; de = x
    ; bc = y
    ld hl, (_ent_spider_handle)
    ld de, 240 - 22
    ld bc, 15
    rst  0
    .db  ERAPI_SetSpritePosAnimatedSpeed

    pop bc

    ; ;; 3 rows of 5 each

    ld a, 42
    ld ($$$_pm_start_y$$$), a
    ld a, 26
    ld ($$$_pm_cursor_start_y$$$), a


    ;; fade the grass palette back

    ld hl, _ent1_grass_palette
    ld c, 14
    ld d, 12
    ld e, 2
    rst 0
    .db ERAPI_SetBackgroundPalette

    ;;;;;;;;;;;;;; EASTER EGG ;;;;;;;;;;;;;;;;

    ld b, ACHIEVEMENTS_EXOATTACK
    call common_check_achievement
    cp 1
    ;; no achievement? nothing to do
    ret nz

    ;; exo achievement accomplished, show tina
    ; ERAPI_SpriteCreate()
    ; e  = pal#
    ; hl = sprite data
    ld e, 11
    ld hl, _ent1_sprite_tina
    rst 0
    .db ERAPI_SpriteCreate

    ; ERAPI_SetSpritePos()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, -200
    ld bc, 150
    rst  0
    .db  ERAPI_SetSpritePos

    ;; speed for the movement on stack
    ld bc, 300
    push bc

    ; ERAPI_SetSpritePosAnimatedSpeed()
    ; hl = handle
    ; de = x
    ; bc = y
    ld de, 400
    ld bc, 150
    rst  0
    .db  ERAPI_SetSpritePosAnimatedSpeed

    pop bc
    ret


    .even
_ent1_tiles_spider:
    .include "/home/matt/dev/ereaderz80/src/nonogram/spider.tiles.asm"
_ent1_sprite_spider:
    .dw _ent1_tiles_spider  ; tiles
    .dw 0 ; palette
    .db 0x02          ; width
    .db 0x05          ; height
    .db 0x02          ; frames per bank
    .db 0x02          ; ?
    .db 0x02          ; hitbox width
    .db 0x02          ; hitbox height
    .db 0x02          ; total frames

    .even
_ent1_tiles_tina:
    .include "/home/matt/dev/ereaderz80/src/nonogram/tina.tiles.asm"
_ent1_palette_tina:
    .include "/home/matt/dev/ereaderz80/src/nonogram/tina.palette.asm"
_ent1_sprite_tina:
    .dw _ent1_tiles_tina  ; tiles
    .dw _ent1_palette_tina ; palette
    .db 0x02          ; width
    .db 0x02          ; height
    .db 0x01          ; frames per bank
    .db 0x01          ; ?
    .db 0x01          ; hitbox width
    .db 0x01          ; hitbox height
    .db 0x01          ; total frames

;; this is the standard grass palette (bg 84), but with a 65% white fade on it
_ent1_grass_palette:
    .dw 0x5775  ; b1e2ae
    .dw 0x5799 ; d0edb1
    .dw 0x5394  ; abeda6
    .dw 0x5394  ; abeda6
    .dw 0x53b4  ; abf3a8
    .dw 0x57f5  ; b1ffae
    .dw 0x67fb  ; e5ffd0
    .dw 0x5f7c  ; ede5bf
    .dw 0x5f7c  ; ebe2bf
    .dw 0x5f9d  ; f0e7c2
    .dw 0x639d  ; f6edc8
    .dw 0x63be ; f9f0cb

    .even
    ;; this include must be down here as it has code in it, otherwise
    ;; it will screw up the callback function at runtime
.include "/home/matt/dev/ereaderz80/src/common/check_achievement.asm"
_ent_spider_handle:
    .dw 0
    ;; to load the achievement data into
    ;; see check_achievement.asm
_c_loaded_flash:
    .ds 16