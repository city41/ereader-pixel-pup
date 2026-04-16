EJ_UPPER_BYTE = 0x82

;; converts an ascii string to ej
;;
;; parameters:
;; bc: pointer to the string
;; 
;; returns
;; bc: the string in ej
ej_string:
    .ifdef US_TEXT
        ;; for US, the string is already fine
        ret
    .else
        ;; this function should do no clobbering
        push hl
        push de
        push af

        ;; an ej string is just
        ;; - two bytes per char instead of one
        ;; - first byte is always 0x82
        ;; - second byte is asciiValue + 0x20

        ;; loop counter
        ld d, 0
        ld e, 0

        ej_string__loop:
        ;; move input string to hl
        push bc
        pop hl
        ;; move forward to the current spot in the string
        add hl, de

        ;; grab the next ascii byte
        ld a, (hl)

        ;; get the output string ready
        ld hl, _ej_buffer
        ;; twice since the output string is words
        add hl, de
        add hl, de

        ;; if we have hit the null terminator, we are done
        cp 0
        jr z, ej_string__done

        ld (hl), EJ_UPPER_BYTE
        inc hl

        ;; move from ascii to where these characters live in shift jis
        add 0x20

        cp 0x40
        ;; special case: if this is a space, skip the capital letter massaging
        jr z, ej_string__shift_done

        ;; is this a capital letter? then only add 0x1f
        cp 0x81
        jr c, ej_string__capital
        jr ej_string__shift_done

        ej_string__capital:
        ;; go back one for capitals
        dec a

        ej_string__shift_done:
        ;; and move the ascii byte then throw it on
        ld (hl), a

        ;; increase our counter
        inc e
        jr ej_string__loop
        
        ej_string__done:
        ;; add on the null terminator
        ld (hl), 0

        ;; restore 
        pop af
        pop de
        pop hl
        ;; set up the return value
        ld bc, _ej_buffer
        ret
    .endif

_ej_buffer:
    .include '_ej_buffer.asm'