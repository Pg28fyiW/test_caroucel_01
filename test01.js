 // テキスト＆バナーカルーセル
function AAA() {
    const f = document.querySelector(".slider_AAA");
    let n = document.querySelector(".slider__Group_AAA"),
        t = document.querySelectorAll(".slider__Item_AAA");
    const c = document.querySelector(".slider__IndicatorGroup_AAA");
    let B = document.querySelector(".slider__Indicator_AAA"),
        s = document.querySelector(".sliderCurrent_AAA"),
        u = document.querySelector(".slider__prev_AAA"),
        a = document.querySelector(".slider__next_AAA"),
        m = !1,
        d = 0;
    
    function v() {
        t = document.querySelectorAll(".slider__Item_AAA");
        for (let r = 0; r < t.length; r++) t[r].classList.remove("sliderCurrent_AAA");
        t[2] ? t[2].classList.add("sliderCurrent_AAA") : t[1] && t[1].classList.add("sliderCurrent_AAA"), s = document.querySelector(".sliderCurrent_AAA"), s && (d = Number(s.getAttribute("data-slider-index")))
    }

    function T() {
        const r = document.querySelectorAll(".slider__Indicator_AAA");
        for (let i = 0; i < r.length; i++) r[i].classList.remove("indicatorCurrent_AAA");
        r[d].classList.add("indicatorCurrent_AAA")
    }

    function h() {
         n && n.classList.add("sliderSingle_AAA"), u && u.remove(), a && a.remove(), c && c.remove()
    }

    function o(r, i) {
        if (!m) {
            m = !0;
            for (let l = 0; l < i; l++)  {
                if (r === "next") n && n.appendChild(t[0]);
                else if (r === "prev") n && n.insertBefore(t[t.length - 1], t[0]);
                else return;
                v(), T()
            }
            m = !1
        }
    }

    function Q(r) {
        if (s && (d = Number(s.getAttribute("data-slider-index")), d !== r))
            if (d < r) {
                let i = r - d;
                o("next", i)
            } else {
                let i = d - r;
                o("prev", i)
            }
    }

    // インディケーターを生成している
    function V() {
        for (let e = 0; e < t.length - 1; e++) c && B && c.appendChild(B.cloneNode(!0));
        t.length === 1 && h();
        const r = document.querySelectorAll(".slider__Indicator_AAA");
        for (let e = 0; e < t.length; e++) t[e].setAttribute("data-slider-index", String(e)), r[e] && r[e].setAttribute("data-indicator-index", String(e));
        for (let e = 0; e < r.length; e++) r[e].addEventListener("click", function () {
            let Z = Number(r[e].getAttribute("data-indicator-index"));
            Q(Z)
        });
        n && n.insertBefore(t[t.length - 2], t[0]), n && n.insertBefore(t[t.length - 1], t[0]), v(), T(), setTimeout(() => {
            n && n.classList.add("sliderLoaded_AAA")
        }, 50), u && u.addEventListener("click", function () {
            o("prev", 1)
        }), a && a.addEventListener("click", function () {
            o("next", 1)
        });
        let i = 0,
            l = 0,
            g = 30;
        f.addEventListener("touchstart", function (e) {
            i = e.touches[0].pageX, l = e.changedTouches[0].pageX
        }), f.addEventListener("touchmove", function (e) {
            e.preventDefault(), l = e.changedTouches[0].pageX
        }), f.addEventListener("touchend", function (e) {
            l < i && i > l + g ? s("next", 1) : i < l && i + g < l && s("prev", 1)
        })
    }
    V()
}
        
        
        

document.addEventListener('DOMContentLoaded', function() {
    // ここにJavaScriptコードを配置
    AAA()
});

