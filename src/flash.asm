_F_SLOT1 = 241
_F_SLOT2 = 242

flash_init:
    ;; load first save slot data
    ld hl, _f_save_data
    push hl
    pop de
    ld hl, _F_SLOT1
    rst 8
    .db ERAPI_FlashLoadUserData

    ;; load second save slot data
    ld hl, _f_save_data + 16
    push hl
    pop de
    ld hl, _F_SLOT2
    rst 8
    .db ERAPI_FlashLoadUserData

    ret

_f_bitmasks:
    .db 0b00000001
    .db 0b00000010
    .db 0b00000100
    .db 0b00001000
    .db 0b00010000
    .db 0b00100000
    .db 0b01000000
    .db 0b10000000

flash_clear:
    ld hl, _f_save_data
    ld b, _F_SAVE_DATA_SIZE
    ld a, 0
    flash_clear__loop:
    ld (hl), a
    inc hl
    djnz flash_clear__loop

    jp _f_save

;; given the puzzle id in de,
;; returns whether it has been cleared or not
;;
;; parameters
;; de: puzzle id
;; returns
;; a: 0 if not cleared, 1 if cleared
;; clobbers:
;; b, hl, de, a
flash_is_puzzle_cleared:
    ;; save puzzle id
    push de
    call _f_get_byte_pointer
    ;; restore puzzle id
    pop de
    push hl

    call _f_get_bit_index
    push hl
    pop de

    ;; get the bitmask
    ld hl, _f_bitmasks
    add hl, de
    ld a, (hl)
    ld b, a

    ;; get the byte
    pop hl
    ld a, (hl)

    ;; and it with the mask
    and b
    cp 0
    jr z, flash_set_puzzle_cleared__nope
    ;; puzzle is cleared
    ld a, 1
    ret

    flash_set_puzzle_cleared__nope:
    ld a, 0
    ret

;; given the puzzle id in de,
;; sets it to cleared in the flash save data
;; clobbers:
;; b, hl, de, a
flash_set_puzzle_cleared:
    ;; save puzzle id
    push de
    call _f_get_byte_pointer
    ;; restore puzzle id
    pop de
    push hl

    call _f_get_bit_index
    push hl
    pop de

    ;; get the bitmask
    ld hl, _f_bitmasks
    add hl, de
    ld a, (hl)
    ld b, a

    ;; get the byte
    pop hl
    ld a, (hl)

    ;; or it with the bitmask
    or b
    ;; save it back
    ld (hl), a

    ;; fall through to save

_f_save:
    ;; save first save slot data
    ld hl, _f_save_data
    push hl
    pop de
    ld hl, _F_SLOT1
    rst 8
    .db ERAPI_FlashSaveUserData

    ;; save second save slot data
    ld hl, _f_save_data + 16
    push hl
    pop de
    ld hl, _F_SLOT2
    rst 8
    .db ERAPI_FlashSaveUserData

    ret

;; given a puzzle id, returns its byte pointer
;; in the flash data
;;
;; parameters:
;; de: the puzzle id
;; returns:
;; hl: pointer to the corresponding byte
;; clobbers:
;; de
_f_get_byte_pointer:
    ;; byteIndex = id/8
    ld h, d
    ld l, e
    ld de, 8
    rst 8
    .db ERAPI_Div

    ;; point to the byte
    ;; move the index
    push hl
    pop de
    ld hl, _f_save_data
    add hl, de

    ret

;; given a puzzle id, returns its bit index
;; within its flash byte
;;
;; parameters:
;; de: the puzzle id
;; returns:
;; hl: pointer to the corresponding byte
;; clobbers:
;; de
_f_get_bit_index:
    ;; byteIndex = id/8
    ld h, d
    ld l, e
    ld de, 8
    rst 8
    .db ERAPI_Mod
    ret

_f_save_data:
    .include '_f_save_data.asm'
_f_save_data_end:
    _F_SAVE_DATA_SIZE = _f_save_data_end - _f_save_data
