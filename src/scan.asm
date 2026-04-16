S_REGION_WIDTH = 15
S_REGION_HEIGHT = 1
.ifdef US_TEXT
    S_REGION_X = 10
.else
    S_REGION_X = 8
.endif
S_REGION_Y = 9

SCAN_RESULT_SUCCESS = 0
SCAN_RESULT_READ_ERROR = 1
SCAN_RESULT_USER_CANCELED_WITH_A = 2
SCAN_RESULT_USER_CANCELED_WITH_B = 3
SCAN_RESULT_TIMEOUT = 4
SCAN_RESULT_REGION_ERROR = 5
SCAN_RESULT_RAW_CARD = 6

scan_init:
    ; ERAPI_CreateRegion()
    ; h = bg# (0-3)
    ; l = palette bank (0-15)
    ; d = left in tiles
    ; e = top in tiles
    ; b = width in tiles
    ; c = height in tiles
    ld b, S_REGION_WIDTH
    ld c, S_REGION_HEIGHT
    ld d, S_REGION_X
    ld e, S_REGION_Y
    ld h, BG_INDEX_SCAN
    ld l, PALETTE_INDEX_GLOBAL
    rst 0
    .db ERAPI_CreateRegion
    ld  (_s_handle_region), a

    ld d, GLOBAL_PALETTE_WHITE
    ld e, GLOBAL_PALETTE_TRANS
    rst 0
    .db ERAPI_SetTextColor

    ld d, 0
    ld e, GLOBAL_PALETTE_TRANS
    rst 0
    .db ERAPI_SetRegionColor

    ld  bc, _s_press_a_to_scan
    call ej_string

    ; ERAPI_DrawText()
    ; a  = handle
    ; bc = pointer to text
    ; d  = x
    ; e  = y
    ld  de, 0
    rst 0
    .db ERAPI_DrawText

    ret

scan_frame:
    ld hl, (SYS_INPUT_JUST)
    ld a, l
    and ERAPI_KEY_A
    ld a, 0
    ret z

    .ifdef EMBEDPUZZLES
        jp scan_frame__return_success
    .endif

    ld a, (_s_handle_region)
    rst 0
    .db ERAPI_ClearRegion

    ld  bc, _s_scan_now
    call ej_string

    ; ERAPI_DrawText()
    ; a  = handle
    ; bc = pointer to text
    ; d  = x
    ; e  = y
    ld  de, 0
    rst 0
    .db ERAPI_DrawText
    
    ;; A was just pressed, let the user scan in their card
    call sound_play_ready_to_scan_sfx
    ld a, 20
    halt

    ld hl, _s_scan_buffer
    rst 0
    .db ERAPI_ScanDotCode

    cp SCAN_RESULT_RAW_CARD
    jr z, scan_frame__scan_success
    cp SCAN_RESULT_REGION_ERROR
    jr z, scan_frame__scan_success

    ;; the scan result is in a
    cp SCAN_RESULT_USER_CANCELED_WITH_A
    jr z, scan_frame__user_canceled
    cp SCAN_RESULT_USER_CANCELED_WITH_B
    jr z, scan_frame__user_canceled
    cp SCAN_RESULT_TIMEOUT
    jr z, scan_frame__user_canceled

    scan_frame__error:

    ;; if we got here, either there was a read error, or this was
    ;; a non raw card (ie a standalone card, which we don't want),
    ;; which is also an error in this context,
    ;; or finally it was not a puzzle pack card

    call sound_play_scan_error_sfx
    ;; fall through

    scan_frame__user_canceled:
    ;; user canceled, reset the text and start over
    ld  bc, _s_press_a_to_scan
    call ej_string

    ; ERAPI_DrawText()
    ; a  = handle
    ; bc = pointer to text
    ; d  = x
    ; e  = y
    ld a, (_s_handle_region)
    ld  de, 0
    rst 0
    .db ERAPI_DrawText

    ld a, 1
    halt
    ld a, 0
    ret


    scan_frame__scan_success:

    ld hl, _s_scan_buffer
    call _s_is_puzzle_pack_card
    ;; if a=0, then this is not a puzzle pack card
    cp 0
    jr z, scan_frame__error

    ;; move forward to 2 before "vpk0"
    ;; TODO: is this always in the same place?
    ld hl, _s_scan_buffer
    call _s_find_vpk0

    ;; if a=0, then we didn't find "vpk0"
    cp 0
    jr z, scan_frame__error

    ld de, scan_puzzle_buffer
    rst 0
    .db ERAPI_DecompressVPK

    .ifdef EMBEDPUZZLES
        scan_frame__return_success:
    .endif
    call sound_play_scan_success_sfx

    ld a, (_s_handle_region)
    rst 0
    .db ERAPI_ClearRegion

    ld a, 1
    halt
    ret

;; look for "Pixe" in the scan buffer.
;; puzzle pack cards have their name entry as "Pixel Pup"
;; NOTE: this mimics _s_find_vpk0 as much as possible
;; for optimal compression
_s_is_puzzle_pack_card:
    ;; look at 200 characters
    ld c, 200

    _s_is_puzzle_pack_card__retry:
    dec c
    ld a, c
    cp 0
    ;; we tried 200 times and still couldn't find it
    ;; we are done
    ret z

    push hl
    inc hl
    inc hl
    ld a, (hl)
    cp 0x50 ; P
    jr nz, _s_is_puzzle_pack_card__nope

    inc hl
    ld a, (hl)
    cp 0x69 ; i
    jr nz, _s_is_puzzle_pack_card__nope

    inc hl
    ld a, (hl)
    cp 0x78 ; x
    jr nz, _s_is_puzzle_pack_card__nope

    inc hl
    ld a, (hl)
    cp 0x65 ; e
    jr nz, _s_is_puzzle_pack_card__nope

    ;; found it!
    ;; but now hl is pointed way too far away
    ;; so move it back
    ld de, -5
    add hl, de
    ;; clean up the stack, popping to bc
    ;; because we don't want to clobber hl
    pop de
    ret

    _s_is_puzzle_pack_card__nope:
    ;; didn't find it, try again
    pop hl
    inc hl
    jr _s_is_puzzle_pack_card__retry


;; sets hl to point two bytes in front of "vpk0"
;; in the scan buffer. hl must be pointed at the start
;; of the buffer at first call
;;
;; returns
;; hl: pointing two bytes in front of "vpk0" in the scan buffer
;; a: 0 if error, >0 if success
_s_find_vpk0:
    ld c, 200

    _s_find_vpk0__retry:
    dec c
    ld a, c
    cp 0
    ;; we tried 200 times and still couldn't find it
    ;; we are done
    ret z

    push hl
    inc hl
    inc hl
    ld a, (hl)
    cp 0x76 ; v
    jr nz, _s_find_vpk0__nope

    inc hl
    ld a, (hl)
    cp 0x70 ; p
    jr nz, _s_find_vpk0__nope

    inc hl
    ld a, (hl)
    cp 0x6b ; k
    jr nz, _s_find_vpk0__nope

    inc hl
    ld a, (hl)
    cp 0x30 ; 0
    jr nz, _s_find_vpk0__nope

    ;; found it!
    ;; but now hl is pointed way too far away
    ;; so move it back
    ld de, -5
    add hl, de
    ;; clean up the stack, popping to bc
    ;; because we don't want to clobber hl
    pop de
    ret

    _s_find_vpk0__nope:
    ;; didn't find it, try again
    pop hl
    inc hl
    jr _s_find_vpk0__retry

_s_press_a_to_scan:
    .ascii 'Press A to scan\0'

_s_scan_now:
    .ascii 'Scan card now\0'

_s_handle_region:
    .db 0

    .even
_s_scan_buffer:
    .include "_s_scan_buffer.asm"
scan_puzzle_buffer:
    .include "scan_puzzle_buffer.asm"

