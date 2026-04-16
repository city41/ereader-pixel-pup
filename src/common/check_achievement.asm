;; checks if a given achievement has been accomplished
;;
;; each series should have their own function for this, to keep size down
;;
;; parameters
;; b: game bit mask
;;
;; returns
;; a=0: achievement not accomplished
;; a=1: achievement accomplished
common_check_achievement:
    ld hl, ACHIEVEMENTS_FLASH_INDEX
    ld de, _c_loaded_flash
    rst 8
    .db ERAPI_FlashLoadUserData

    ld hl, _c_loaded_flash
    ld a, (hl)
    and b
    cp b
    jr nz, common_check_achievement__not_accomplished
    ;; this achievement has been accomplished
    ld a, 1
    ret

    common_check_achievement__not_accomplished:
    ld a, 0
    ret
