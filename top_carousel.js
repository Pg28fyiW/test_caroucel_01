// <br> タグだけを許可するサニタイズ関数
function sanitizeHtml(html) {
    // <br>, <br/>, <br /> 以外のタグを削除
    return html.replace(/<(?!br\s*\/?[\s>])[^>]*>/g, "").trim();
}

/**
 * getRandomSourceItems:
 * おすすめ元データのアイテムをランダムに並べ替え、必要な件数だけ取り出す関数。
 *
 * @param {number} limitCount 取得したい最大件数。
 * 0や未指定の場合は「上限なし」として全件を返す。
 *
 * @returns {Element[]} ランダム化されたアイテム要素の配列。
 */
function getRandomSourceItems(limitCount) {
	// 元データのアイテム要素をすべて配列として取得する
    const sourceItems = Array.from(document.querySelectorAll(".karte_kcx_data_recommend_source .karte_kcx_data_recommend_item"));
	// 1件もなければ、空配列を返して処理を終了
    if (!sourceItems.length) { return []; }

	// limitCountが未指定や不正でも0以上の数にそろえる
    const maxCount = Math.max(0, limitCount || 0);

	// 取得上限が0（=全件扱い）または件数が上限以下なら、そのまま返す
    if (maxCount === 0 || sourceItems.length <= maxCount) {
        return sourceItems;
    }

	// Fisher-Yates: 後ろから順にランダムな位置と入れ替えると、偏りなく並び替えられる
    for (let i = sourceItems.length - 1; i > 0; i--) {
		// 0〜i の範囲でランダムな添字を作る
        const j = Math.floor(Math.random() * (i + 1));
		// i番目とj番目を交換する
        const tmp = sourceItems[i];
        sourceItems[i] = sourceItems[j];
        sourceItems[j] = tmp;
    }

	// シャッフル後の先頭から maxCount 件だけ返す
    return sourceItems.slice(0, maxCount);
}

// 注記要素から表示可能な文字列だけを取り出す
function getSafeNoteText(sourceNote) {
    if (!sourceNote) { return ""; }

    const safeNote = sanitizeHtml(sourceNote.innerHTML);
    return safeNote ? safeNote : "";
}

// PCタイトルは1行表示向けに<br>を空白へ置換する
function getSafePcTitleText(sourceTitle) {
    if (!sourceTitle) { return ""; }

    const safeTitle = sanitizeHtml(sourceTitle.innerHTML);
    return safeTitle.replace(/<br\s*\/?\s*>/gi, " ").replace(/\s+/g, " ").trim();
}

// 注記の空要素を削除し、注記なし行を上詰め用クラスにする
function compactSpRowsByNote(scopeElement) {
    const scope = scopeElement || document;
    const rows = scope.querySelectorAll(".karte_kcx_sp_rec_home_recomend_row");

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const note = row.querySelector(".karte_kcx_sp_rec_home_recomend_note");

        if (!note) {
            row.classList.add("karte_kcx_sp_rec_home_recomend_row--no-note");
            continue;
        }

        const noteText = (note.textContent || "").replace(/[\s\u00A0]+/g, "").trim();
        const htmlWithoutBr = (note.innerHTML || "").replace(/<br\s*\/?\s*>/gi, "").replace(/[\s\u00A0]+/g, "").trim();

        if (!noteText && !htmlWithoutBr) {
            note.remove();
            row.classList.add("karte_kcx_sp_rec_home_recomend_row--no-note");
        } else {
            row.classList.remove("karte_kcx_sp_rec_home_recomend_row--no-note");
        }
    }
}

// SPカードの実高さに合わせてroot高さを自動補正する
function adjustSpRootHeight() {
    const spRoot = document.querySelector(".karte_kcx_home_recommend_only_sp");
    if (!spRoot) { return; }

    compactSpRowsByNote(spRoot);

    const root = spRoot.querySelector(".karte_kcx_home_recommend_only_sp_root.astro-RSPN73YO_only_sp");
    if (!root) { return; }

    // PC表示ではSPのインライン高さを解除してcssに委ねる
    if (window.innerWidth > 960) {
        root.style.removeProperty("height");
        return;
    }

    // いったんインライン高さを解除して、現在のCSS基準高さを取得
    root.style.removeProperty("height");
    const rootRect = root.getBoundingClientRect();

    const items = spRoot.querySelectorAll(".slider__Group-BZV63T2Q_only_sp .slider__Item-BZV63T2Q_only_sp");
    if (!items.length) { return; }

    let deepestBottom = 0;
    let contentScale = 1;

    for (let i = 0; i < items.length; i++) {
        const itemStyle = window.getComputedStyle(items[i]);
        if (itemStyle.display === "none" || itemStyle.visibility === "hidden") {
            continue;
        }

        const card = items[i].querySelector(".karte_kcx_sp_rec_home_recomend_card");
        if (!card) {
            continue;
        }

        const cardRect = card.getBoundingClientRect();
        const bottomFromRootTop = cardRect.bottom - rootRect.top;
        if (bottomFromRootTop > deepestBottom) {
            deepestBottom = bottomFromRootTop;
        }

        // overflow: hidden で隠れている内容がある場合は高さを拡張する
        if (card.clientHeight > 0 && card.scrollHeight > card.clientHeight) {
            const requiredScale = card.scrollHeight / card.clientHeight;
            if (requiredScale > contentScale) {
                contentScale = requiredScale;
            }
        }
    }

    const indicator = spRoot.querySelector(".slider__IndicatorGroup-BZV63T2Q_only_sp");
    if (indicator) {
        const indicatorRect = indicator.getBoundingClientRect();
        const indicatorBottom = indicatorRect.bottom - rootRect.top;
        if (indicatorBottom > deepestBottom) {
            deepestBottom = indicatorBottom;
        }
    }

    if (deepestBottom <= 0) { return; }

    const currentRootHeight = rootRect.height;
    const requiredByGeometry = Math.ceil(deepestBottom + 10);
    const requiredByContent = Math.ceil(currentRootHeight * contentScale + 8);
    const requiredRootHeight = Math.max(requiredByGeometry, requiredByContent);

    // 注記あり/なしで高さが変化するため、毎回必要高さへ合わせる
    root.style.height = `${requiredRootHeight}px`;
}

function createSpRootHeightAdjuster() {
    let rafId = 0;

    function requestAdjust() {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(function () {
            rafId = 0;
            adjustSpRootHeight();
        });
    }

    return requestAdjust;
}

function setupSpHeightAdjustTriggers(requestSpHeightAdjust) {
    if (typeof requestSpHeightAdjust !== "function") { return; }

    // 画像読込完了時に高さを再計測して、カード下部の切れを防ぐ
    const spImages = document.querySelectorAll(".karte_kcx_home_recommend_only_sp .karte_kcx_sp_rec_home_recomend_thumb");
    for (let i = 0; i < spImages.length; i++) {
        spImages[i].addEventListener("load", requestSpHeightAdjust);
    }

    // 画面幅変更・端末回転時に再計測する
    window.addEventListener("resize", requestSpHeightAdjust);
    window.addEventListener("orientationchange", requestSpHeightAdjust);

    // 初期描画直後と少し遅らせたタイミングの2回で再計測し、
    // フォント反映や画像遅延読込によるズレを吸収する
    setTimeout(requestSpHeightAdjust, 100);
    setTimeout(requestSpHeightAdjust, 300);
}

function adjustPcControlsPosition() {
    const pcRoot = document.querySelector(".karte_kcx_home_recommend_only_pc");
    if (!pcRoot) { return; }

    const slider = pcRoot.querySelector(".pc_carousel_slider");
    const group = pcRoot.querySelector(".pc_carousel_group");
    const controls = pcRoot.querySelector(".pc_carousel_controls");
    if (!slider || !group || !controls) { return; }

    if (window.innerWidth <= 960) {
        controls.style.removeProperty("top");
        controls.style.removeProperty("bottom");
        return;
    }

    const sliderRect = slider.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    const groupBottomFromSliderTop = groupRect.bottom - sliderRect.top;

    controls.style.top = "0px";
    controls.style.removeProperty("bottom");

    const controlsRect = controls.getBoundingClientRect();
    const lowerBottomGap = 16;
    const minGapFromSlides = 8;

    // まずは下寄せにしつつ、カード領域と重ならない範囲に収める
    const maxAllowedBottom = sliderRect.height - (groupBottomFromSliderTop + controlsRect.height + minGapFromSlides);
    const usableBottom = Math.max(0, maxAllowedBottom);
    const bottom = Math.min(lowerBottomGap, usableBottom);

    const desiredTop = sliderRect.height - controlsRect.height - bottom;
    const minTop = groupBottomFromSliderTop + minGapFromSlides;
    const maxTop = Math.max(minTop, sliderRect.height - controlsRect.height - 2);
    const clampedTop = Math.min(Math.max(minTop, desiredTop), maxTop);

    controls.style.top = `${Math.round(clampedTop)}px`;
}

// PCカードの実高さに合わせてroot高さを自動補正する
function adjustPcRootHeight() {
    const pcRoot = document.querySelector(".karte_kcx_home_recommend_only_pc");
    if (!pcRoot) { return; }

    const root = pcRoot.querySelector(".pc_carousel_root");
    if (!root) { return; }
    const group = pcRoot.querySelector(".pc_carousel_group");
    if (!group) { return; }

    // SP表示ではPCのインライン高さを解除してcssに委ねる
    if (window.innerWidth <= 960) {
        root.style.removeProperty("height");
        root.style.removeProperty("min-height");
        adjustPcControlsPosition();
        return;
    }

    // いったんインライン高さを解除して、現在のCSS基準高さを取得
    root.style.removeProperty("height");
    root.style.removeProperty("min-height");
    const rootRect = root.getBoundingClientRect();
    const groupRect = group ? group.getBoundingClientRect() : null;
    const items = pcRoot.querySelectorAll(".pc_carousel_item");

    let deepestContentBottom = 0;
    let reserveSpace = 70;

    if (groupRect) {
        const estimatedReserve = rootRect.height - groupRect.height;
        if (estimatedReserve > 0) {
            reserveSpace = estimatedReserve;
        }
    }

    for (let i = 0; i < items.length; i++) {
        const itemStyle = window.getComputedStyle(items[i]);
        if (itemStyle.display === "none" || itemStyle.visibility === "hidden") {
            continue;
        }

        const card = items[i].querySelector(".karte_kcx_pc_rec_home_recomend_card");
        if (!card) {
            continue;
        }

        const note = card.querySelector(".karte_kcx_pc_rec_home_recomend_note");
        const desc = card.querySelector(".karte_kcx_pc_rec_home_recomend_desc");
        const body = card.querySelector(".karte_kcx_pc_rec_home_recomend_body");
        const bottomAnchor = note || desc || body || card;
        const anchorRect = bottomAnchor.getBoundingClientRect();

        // 注記(なければ本文末尾)の直下に20pxだけ白余白を残す
        const bottomFromRootTop = anchorRect.bottom - rootRect.top + 20;
        if (bottomFromRootTop > deepestContentBottom) {
            deepestContentBottom = bottomFromRootTop;
        }
    }

    if (deepestContentBottom <= 0) { return; }

    // カードの必要高さ + 下部コントロール領域のみを確保する
    const requiredRootHeight = Math.ceil(deepestContentBottom + reserveSpace);

    root.style.minHeight = "0px";
    root.style.height = `${requiredRootHeight}px`;
    adjustPcControlsPosition();
}

function createPcRootHeightAdjuster() {
    let rafId = 0;

    function requestAdjust() {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(function () {
            rafId = 0;
            adjustPcRootHeight();
        });
    }

    return requestAdjust;
}

function setupPcHeightAdjustTriggers(requestPcHeightAdjust) {
    if (typeof requestPcHeightAdjust !== "function") { return; }

    // 画像読込完了時に高さを再計測して、カード下部の切れを防ぐ
    const pcImages = document.querySelectorAll(".karte_kcx_home_recommend_only_pc .karte_kcx_pc_rec_home_recomend_thumb");
    for (let i = 0; i < pcImages.length; i++) {
        pcImages[i].addEventListener("load", requestPcHeightAdjust);
    }

    // 画面幅変更・端末回転時に再計測する
    window.addEventListener("resize", requestPcHeightAdjust);
    window.addEventListener("orientationchange", requestPcHeightAdjust);

    // 初期描画直後と少し遅らせたタイミングの2回で再計測し、
    // フォント反映や画像遅延読込によるズレを吸収する
    setTimeout(requestPcHeightAdjust, 100);
    setTimeout(requestPcHeightAdjust, 300);
}

// サイドイメージカルーセル
function createSP1s3cSideImageCarousel() {

    // SP用カルーセル全体を取得する
    const spRoot = document.querySelector(".karte_kcx_home_recommend_only_sp");

    // SP用HTMLが存在しない場合は処理を終了する
    if (!spRoot) { return; }

    // カルーセルがHTMLないに存在するか確認する
    const isCarouselVisible = () => {
        const carousel = spRoot.querySelector(".slider__Group-BZV63T2Q_only_sp");
        return carousel !== null;
    }

    // カルーセルが存在しない場合は処理を終了する
    if (!isCarouselVisible()) {
        return;
    }

    const c = spRoot.querySelector(".slider-BZV63T2Q_only_sp");
    let i = spRoot.querySelector(".slider__Group-BZV63T2Q_only_sp"),
        e = spRoot.querySelectorAll(".slider__Item-BZV63T2Q_only_sp");
    let u = spRoot.querySelector(".slider__IndicatorGroup-BZV63T2Q_only_sp");

    let B = spRoot.querySelector(".slider__Indicator-BZV63T2Q_only_sp"),
        o = spRoot.querySelector(".sliderCurrent-BZV63T2Q_only_sp"),
        a = spRoot.querySelector(".slider__prev-BZV63T2Q_only_sp"),
        f = spRoot.querySelector(".slider__next-BZV63T2Q_only_sp"),
        m = !1,
        d = 0;

    // カルーセルが存在する場合にのみ実行する
    let autoplayIntervalId;   // 自動再生のタイムアウトID

    // 自動スライド設定(5秒)の関数
    function startAutoSlide() {
        // カルーセルが存在しない場合、処理終了
        if (!isCarouselVisible()) return;

        // すでに自動再生が始まっているなら、何もしない
        if (autoplayIntervalId || !isCarouselVisible()) return;

        autoplayIntervalId = setInterval(() => {
            s("next", 1);  // 次のスライドへ移動
        }, 5000);
    }

    // 自動スライドを停止
    function stopAutoplay() {
        clearInterval(autoplayIntervalId);
        autoplayIntervalId = null;   // idをリセット
    }

    // 停止ボタンの位置をインディケーターの右端に配置するメソッド
    function setPauseBtnPosition() {
        const dotWidth = 8;   // ドットの幅
        const dotSpace = 12;  // ドットとドットの間の幅

        const indicatorItems = spRoot.querySelectorAll(".slider__Item-BZV63T2Q_only_sp");
        const numIndicators = indicatorItems.length;

        // インディケーターの総幅を取得
        const totalWidth = (dotWidth * numIndicators) + (dotSpace * (numIndicators - 1));
        // インディケーターの総幅の半分に15pxの余白をプラス
        const offsetPauseBtn = (totalWidth / 2) + 15;

        const pauseBtn = spRoot.querySelector(".karte_kcx_home_recommend_only_sp_auto_slide_btn.pause");
        pauseBtn.style.left = `calc(50% + ${offsetPauseBtn}px)`;
    }

	// 自動スライドの再生ボタンと停止ボタンを押した時のメソッド
	function togglePauseOrStart() {
		const dot = spRoot.querySelector(".karte_kcx_home_recommend_only_sp_auto_slide_btn");
		let isPause = true;   //初期状態は自動スライド再生しているので停止ボタンを表示

		dot.addEventListener("click", function() {
			if (isPause) {
				// 停止ボタンから再生ボタンに切り替える
				dot.classList.remove("pause");
				dot.classList.add("triangle");
				stopAutoplay();   //自動スライドを停止
			} else {
				// 再生ボタンから停止ボタンに切り替える
				dot.classList.remove("triangle");
				dot.classList.add("pause");
				startAutoSlide();   // 自動スライドを開始
			}
			// 状態をトグルする
			isPause = !isPause;
		});
	}

	// PC表示かどうかを判定する
	function isPcLayout() {
		return window.innerWidth >= 961;
	}

	function T() {
		e = spRoot.querySelectorAll(".slider__Item-BZV63T2Q_only_sp");

		// すべてのスライドから現在位置を表すクラスを削除する
		for (let r = 0; r < e.length; r++) {
			e[r].classList.remove("sliderCurrent-BZV63T2Q_only_sp");
		}

		// PCは左端(1番目)、SP(960px以下)は中央(3番目)
		let currentSlideIndex;

		if (isPcLayout()) {
			// PCでは、一番左に表示されている1番目のスライドを現在位置にします。
			currentSlideIndex = 0;
		} else if (e[2]) {
			// 960px以下では、今までどおり中央にある3番目のスライドを現在位置にする。
			currentSlideIndex = 2;
		} else {
			// スライドが少ない場合の予備処理
			currentSlideIndex = 1;
		}

		// 対象スライドに現在位置クラスを付与
		if (e[currentSlideIndex]) {
			e[currentSlideIndex].classList.add("sliderCurrent-BZV63T2Q_only_sp");
		}

		// 現在位置スライドを再取得する
		o = spRoot.querySelector(".sliderCurrent-BZV63T2Q_only_sp");
		// インディケーター用の番号を設定
		if (o) {
			d = Number(o.getAttribute("data-slider-index"));
		}
	}

	function g() {
		const r = spRoot.querySelectorAll(".slider__Indicator-BZV63T2Q_only_sp");
		if (!r || r.length === 0) return;
		for (let n = 0; n < r.length; n++) r[n].classList.remove("indicatorCurrent-BZV63T2Q_only_sp");
		r[d].classList.add("indicatorCurrent-BZV63T2Q_only_sp");
	}

	function v() {
		if (e.length === 1) {
			i && i.classList.add("sliderSingle-BZV63T2Q_only_sp");
			a && a.remove();
			f && f.remove();
			u && u.remove();
		}
		// 2枚以上は無条件に無限カルーセル（何もしない）
	}

	function s(r, n) {
		if (!m) {
			m = !0;
			for (let l = 0; l < n; l++) setTimeout(() => {
				i = spRoot.querySelector(".slider__Group-BZV63T2Q_only_sp"); // 再取得
				e = spRoot.querySelectorAll(".slider__Item-BZV63T2Q_only_sp"); // 再取得

				if (!i || !e || e.length === 0) {
					m = false;
					return;
				}

				if (r === "next") {
					if (i && e[0] instanceof Node) {
						i.appendChild(e[0]);
					}
				}
				else if (r === "prev") {
					if (i && e[e.length - 1] instanceof Node && e[0] instanceof Node) {
						i.insertBefore(e[e.length - 1], e[0]);
					}
				}
				else return;
				T(), g()
			}, 200 * l);
			e.length < 5 ? m = !1 : setTimeout(() => {
				m = !1
			}, 800)
		}
	}

	function Q(r) {
		if (o && (d = Number(o.getAttribute("data-slider-index")), d !== r))
			if (d < r) {
				let n = r - d;
				s("next", n)
			} else {
				let n = d - r;
				s("prev", n)
			}
	}

	// ランダム表示
	function slideRandam() {
		var elements = spRoot.querySelectorAll(".slider__Group-BZV63T2Q_only_sp .slider__Item-BZV63T2Q_only_sp");
		var elementsArray = Array.prototype.slice.call(elements);
		if (!elementsArray.length || !elements[0] || !elements[0].parentNode) return;
		elementsArray.sort(function() {
			return Math.random() - 0.5;
		});
		var parent = elements[0].parentNode;
		elementsArray.forEach(function(element){
			if (element instanceof Node) {
				parent.appendChild(element);
			}
		})
	}

	// コンテンツ数に応じたクラスを付ける(SP)
	function setContentCountClass() {

		// SP用カルーセル内にある、すべての商品カードを取得する
		var cards = spRoot.querySelectorAll(".slider__Group-BZV63T2Q_only_sp .karte_kcx_sp_rec_home_recomend_card");

		// 取得した商品カードを1枚ずつ処理する
		for (var i = 0; i < cards.length; i++) {

			// 現在処理している商品カードを取得する
			var card = cards[i];

			// 前回付けた可能性がある商品数クラスをすべて削除する
			card.classList.remove("karte_kcx_sp_rec_home_recomend_card--count-1");
			card.classList.remove("karte_kcx_sp_rec_home_recomend_card--count-2");
			card.classList.remove("karte_kcx_sp_rec_home_recomend_card--count-3");

			// カード内にあるすべての子要素を取得する
			var children = card.children;

			// カード内の商品数を数える変数を0で初期化する
			var contentCount = 0;

			// カード内の子要素を1つずつ確認する
			for (var j = 0; j < children.length; j++) {

				// karte_kcx_sp_rec_home_recomend_rowクラスを持つ子要素なら商品数を1増やす
				if (children[j].classList.contains("karte_kcx_sp_rec_home_recomend_row")) {
					contentCount++;
				}
			}

			// 商品が0件でも、最低値を1として扱う
			if (contentCount < 1) {
				contentCount = 1;
			}

			// 商品が4件でも、最低値を3として扱う
			if (contentCount > 3) {
				contentCount = 3;
			}

			// 商品数に応じたクラスをカードに追加する
			card.classList.add("karte_kcx_sp_rec_home_recomend_card--count-" + contentCount);
		}
	}

	// インディケーターの生成
	function V() {

		// ランダム表示後、Nodeを再取得
		e = spRoot.querySelectorAll(".slider__Item-BZV63T2Q_only_sp");
		u = spRoot.querySelector(".slider__IndicatorGroup-BZV63T2Q_only_sp");
		B = spRoot.querySelector(".slider__Indicator-BZV63T2Q_only_sp");

		const origCount = e.length; // 元の枚数を保存
		const minLoopSlides = 5;

		for (let t = 0; t < origCount - 1; t++) {
			u && B && u.appendChild(B.cloneNode(!0));
		}

		if (v(), origCount === 1) return;

		const r = spRoot.querySelectorAll(".slider__Indicator-BZV63T2Q_only_sp");

		for (let t = 0; t < origCount; t++) {
			e[t].setAttribute("data-slider-index", String(t));
			r[t] && r[t].setAttribute("data-indicator-index", String(t));
		}

		for (let t = 0; t < r.length; t++) {
			r[t].addEventListener("click", function () {
				let z = Number(r[t].getAttribute("data-indicator-index"));
				Q(z);
			});
		}

		// 5枚未満は「枚数の倍数」で配列を組み直して、周回時の並び崩れを防ぐ
		if (origCount < minLoopSlides && i) {
			const originalSlides = Array.from(e);
			const loopCount = Math.ceil(minLoopSlides / origCount) * origCount;
			const startOffset = (origCount - 2 + origCount) % origCount;

			i.innerHTML = "";

			for (let t = 0; t < loopCount; t++) {
							const srcIndex = (startOffset + t) % origCount;
				const clone = originalSlides[srcIndex].cloneNode(true);
				clone.setAttribute("data-slider-index", String(srcIndex));
				i.appendChild(clone);
			}

			e = spRoot.querySelectorAll(".slider__Item-BZV63T2Q_only_sp");

		} else if (i && i.firstElementChild && i.lastElementChild) {

			// 5枚以上は末尾2枚を順序維持したまま先頭に回す
			i.insertBefore(i.lastElementChild, i.firstElementChild);
			i.insertBefore(i.lastElementChild, i.firstElementChild);

			e = spRoot.querySelectorAll(".slider__Item-BZV63T2Q_only_sp");
		}

		T(), g(), setTimeout(() => {
			i && i.classList.add("sliderLoaded-BZV63T2Q_only_sp")
		}, 50),

		a && a.addEventListener("click", function () {
			s("prev", 1)
		}),

		f && f.addEventListener("click", function () {
			s("next", 1)
		});

		let n = 0,
			l = 0,
			h = 30;

		c && (
			c.addEventListener("touchstart", function (t) {
				n = t.touches[0].pageX,
				l = t.changedTouches[0].pageX
			}),

			c.addEventListener("touchmove", function (t) {
				t.preventDefault(),
				l = t.changedTouches[0].pageX
			}),

			c.addEventListener("touchend", function (t) {
				l < n && n > l + h ? s("next", 1)
					: n < l && n + h < l && s("prev", 1)
			})
		)
	}

	// コンテンツ数に応じたクラスを付ける(SP)
	setContentCountClass();

	// ランダム表示
	//slideRandom()

	// ランダム表示後に、インディケーターの生成
	V();

	// 自動スライド設定
	startAutoSlide();

	// 停止ボタンの位置をインディケーターの右端に配置するメソッド
	setPauseBtnPosition();

	// 自動スライドの再生ボタンと停止ボタンを押した時のメソッド
	togglePauseOrStart();
} // End createSP1s3cSideImageCarousel()

// SP用1スライドにつき最大3件の商品を配置する
function createSpItemsFromSource(sourceItems) {

	const items = sourceItems || [];
	const spGroup = document.querySelector(".karte_kcx_home_recommend_only_sp .slider__Group-BZV63T2Q_only_sp");

	if (!spGroup || items.length === 0) { return; }

	// 現在HTMLに直接書かれているSP用スライドを削除する
	spGroup.innerHTML = "";

	for (let i = 0; i < items.length; i += 3) {

		const slideItem = document.createElement("div");
		const card = document.createElement("div");

		slideItem.className = "karte_kcx_home_recommend_only_sp_slider__Item slider__Item-BZV63T2Q_only_sp astro-RSPN73YO_only_sp";
		card.className = "karte_kcx_sp_rec_home_recomend_card";

		const slideItems = items.slice(i, i + 3);

		slideItems.forEach(function (sourceItem) {

			const sourceImage = sourceItem.querySelector(".karte_kcx_data_recommend_thumb");
			const sourceTitle = sourceItem.querySelector(".karte_kcx_data_recommend_title");
			const sourceDescription = sourceItem.querySelector(".karte_kcx_data_recommend_desc");
			const sourceNote = sourceItem.querySelector(".karte_kcx_data_recommend_note");
			const row = document.createElement("a");
			const safeNote = getSafeNoteText(sourceNote);

			row.className = "karte_kcx_sp_rec_home_recomend_row";
			row.href = sourceItem.getAttribute("href") || "";

			const sourceTarget = sourceItem.getAttribute("target");
			if (sourceTarget) {
				row.setAttribute("target", sourceTarget);

				if (sourceTarget === "_blank") {
					row.setAttribute("rel", "noopener noreferrer");
				}
			}

			row.innerHTML = `
				<div class="karte_kcx_sp_rec_home_recomend_media">
					<img class="karte_kcx_sp_rec_home_recomend_thumb"
						src="${sourceImage ? sourceImage.getAttribute("src") : ""}"
						alt="${sourceImage ? sourceImage.getAttribute("alt") : ""}">
				</div>
				<div class="karte_kcx_sp_rec_home_recomend_body">
					<p class="karte_kcx_sp_rec_home_recomend_title">${sourceTitle ? sanitizeHtml(sourceTitle.innerHTML) : ""}</p>
					<span class="karte_kcx_sp_rec_home_recomend_line"></span>
					<p class="karte_kcx_sp_rec_home_recomend_desc">${sourceDescription ? sanitizeHtml(sourceDescription.innerHTML) : ""}</p>
				</div>
				${safeNote ? `<p class="karte_kcx_sp_rec_home_recomend_note">${safeNote}</p>` : ""}
			`;

			compactSpRowsByNote(row);
			card.appendChild(row);
		});

		slideItem.appendChild(card);
		spGroup.appendChild(slideItem);
	}

	compactSpRowsByNote(spGroup);
}

// PC用カルーセルへ配置する
function createPcItemsFromSource(sourceItems) {

	const items = sourceItems || [];
	const pcGroup = document.querySelector(".karte_kcx_home_recommend_only_pc .pc_carousel_group");

	if (!pcGroup || items.length === 0) { return; }

	// 現在HTMLに直接書かれているPC用カードを削除する
	pcGroup.innerHTML = "";

	items.forEach(function (sourceItem) {

		const pcItem = document.createElement("a");
		pcItem.className = "pc_carousel_item";
		pcItem.href = sourceItem.getAttribute("href") || "";

		const sourceTarget = sourceItem.getAttribute("target");
		if (sourceTarget) {
			pcItem.setAttribute("target", sourceTarget);

			if (sourceTarget === "_blank") {
				pcItem.setAttribute("rel", "noopener noreferrer");
			}
		}

		const sourceImage = sourceItem.querySelector(".karte_kcx_data_recommend_thumb");
		const sourceTitle = sourceItem.querySelector(".karte_kcx_data_recommend_title");
		const sourceDescription = sourceItem.querySelector(".karte_kcx_data_recommend_desc");
		const sourceNote = sourceItem.querySelector(".karte_kcx_data_recommend_note");
		const safePcTitle = getSafePcTitleText(sourceTitle);
		const safeNote = getSafeNoteText(sourceNote);

		pcItem.innerHTML = `
			<div class="karte_kcx_pc_rec_home_recomend_card">
				<div class="karte_kcx_pc_rec_home_recomend_media">
					<img class="karte_kcx_pc_rec_home_recomend_thumb"
						src="${sourceImage ? sourceImage.getAttribute("src") : ""}"
						alt="${sourceImage ? sourceImage.getAttribute("alt") : ""}">
				</div>

				<div class="karte_kcx_pc_rec_home_recomend_body">
					<p class="karte_kcx_pc_rec_home_recomend_title">${safePcTitle}</p>
					<span class="karte_kcx_pc_rec_home_recomend_line"></span>
					<p class="karte_kcx_pc_rec_home_recomend_desc">${sourceDescription ? sanitizeHtml(sourceDescription.innerHTML) : ""}</p>
					${safeNote ? `<p class="karte_kcx_pc_rec_home_recomend_note">${safeNote}</p>` : ""}
				</div>
			</div>
		`;

		pcGroup.appendChild(pcItem);
	});
}

// PC用カルーセルへ配置する
function createPcItemsFromSource(sourceItems) {

	const items = sourceItems || [];
	const pcGroup = document.querySelector(".karte_kcx_home_recommend_only_pc .pc_carousel_group");

	if (!pcGroup || items.length === 0) { return; }

	// 現在HTMLに直接書かれているPC用カードを削除する
	pcGroup.innerHTML = "";

	items.forEach(function (sourceItem) {

		const pcItem = document.createElement("a");
		pcItem.className = "pc_carousel_item";
		pcItem.href = sourceItem.getAttribute("href") || "";

		const sourceTarget = sourceItem.getAttribute("target");
		if (sourceTarget) {
			pcItem.setAttribute("target", sourceTarget);

			if (sourceTarget === "_blank") {
				pcItem.setAttribute("rel", "noopener noreferrer");
			}
		}

		const sourceImage = sourceItem.querySelector(".karte_kcx_data_recommend_thumb");
		const sourceTitle = sourceItem.querySelector(".karte_kcx_data_recommend_title");
		const sourceDescription = sourceItem.querySelector(".karte_kcx_data_recommend_desc");
		const sourceNote = sourceItem.querySelector(".karte_kcx_data_recommend_note");
		const safePcTitle = getSafePcTitleText(sourceTitle);
		const safeNote = getSafeNoteText(sourceNote);

		pcItem.innerHTML = `
			<div class="karte_kcx_pc_rec_home_recomend_card">
				<div class="karte_kcx_pc_rec_home_recomend_media">
					<img class="karte_kcx_pc_rec_home_recomend_thumb"
						src="${sourceImage ? sourceImage.getAttribute("src") : ""}"
						alt="${sourceImage ? sourceImage.getAttribute("alt") : ""}">
				</div>

				<div class="karte_kcx_pc_rec_home_recomend_body">
					<p class="karte_kcx_pc_rec_home_recomend_title">${safePcTitle}</p>
					<span class="karte_kcx_pc_rec_home_recomend_line"></span>
					<p class="karte_kcx_pc_rec_home_recomend_desc">${sourceDescription ? sanitizeHtml(sourceDescription.innerHTML) : ""}</p>
					${safeNote ? `<p class="karte_kcx_pc_rec_home_recomend_note">${safeNote}</p>` : ""}
				</div>
			</div>
		`;

		pcGroup.appendChild(pcItem);
	});
}

// PC用カルーセルの関数を追加する
function createPc4SlideCarousel(requestPcHeightAdjust) {

	var pcRoot = document.querySelector(".karte_kcx_home_recommend_only_pc .pc_carousel_root");
	if (!pcRoot) return;

	var group = pcRoot.querySelector(".pc_carousel_group");
	var prevButton = pcRoot.querySelector(".pc_carousel_prev");
	var nextButton = pcRoot.querySelector(".pc_carousel_next");
	var indicatorGroup = pcRoot.querySelector(".pc_carousel_indicators");
	var pauseButton = pcRoot.querySelector(".pc_carousel_pause");
	if (!group) return;

	var autoplayIntervalId = null;
	var isPlaying = true;

	function requestPcLayoutAdjust() {
		if (typeof requestPcHeightAdjust === "function") {
			requestPcHeightAdjust();
		}
	}

	function getSlides() {
		return group.querySelectorAll(".pc_carousel_item");
	}

	var firstSlides = getSlides();

	for (var i = 0; i < firstSlides.length; i++) {
		firstSlides[i].setAttribute("data-pc-index", String(i));
	}

	function createIndicators() {
		if (!indicatorGroup) return;

		indicatorGroup.innerHTML = "";

		for (var i = 0; i < firstSlides.length; i++) {
			var indicator = document.createElement("button");
			indicator.type = "button";
			indicator.className = "pc_carousel_indicator";
			indicator.setAttribute("data-pc-indicator-index", String(i));
			indicator.setAttribute("aria-label", String(i + 1) + "ページ目を表示");

			indicator.addEventListener("click", function () {
				var targetIndex = Number(this.getAttribute("data-pc-indicator-index"));
				moveTo(targetIndex);
			});

			indicatorGroup.appendChild(indicator);
		}
	}

	function updateIndicators() {
		if (!indicatorGroup) return;

		var slides = getSlides();
		var indicators = indicatorGroup.querySelectorAll(".pc_carousel_indicator");
		if (!slides[0]) return;

		var currentIndex = Number(slides[0].getAttribute("data-pc-index"));

		for (var i = 0; i < indicators.length; i++) {
			indicators[i].classList.remove("is-current");
		}

		if (indicators[currentIndex]) {
			indicators[currentIndex].classList.add("is-current");
		}
	}

	function shiftSlides(direction, shouldAdjustLayout) {
		var slides = getSlides();
		if (slides.length <= 4) return false;

		if (direction === "next") {
			group.appendChild(slides[0]);
		} else if (direction === "prev") {
			group.insertBefore(slides[slides.length - 1], slides[0]);
		} else {
			return false;
		}

		updateIndicators();

		if (shouldAdjustLayout !== false) {
			requestPcLayoutAdjust();
		}

		return true;
	}

	function moveNext(fromButton) {
		var slides = getSlides();
		if (slides.length <= 4) return;

		if (fromButton) {
			var firstSlide = slides[0];
			if (!(firstSlide instanceof Node)) return;

			// 左ボタン時の反対モーションにするため、先頭カードの見た目だけをゴーストで左へフェードアウトさせる
			var ghostSlide = firstSlide.cloneNode(true);
			ghostSlide.setAttribute("aria-hidden", "true");
			ghostSlide.style.pointerEvents = "none";
			ghostSlide.style.zIndex = "8";
			ghostSlide.style.transition = "none";
			ghostSlide.style.left = "0%";
			ghostSlide.style.opacity = "1";

			group.appendChild(ghostSlide);
			group.appendChild(firstSlide);

			updateIndicators();
			requestPcLayoutAdjust();

			requestAnimationFrame(function () {
				ghostSlide.style.transition = "left 0.8s ease, opacity 0.8s ease";
				ghostSlide.style.left = "-25%";
				ghostSlide.style.opacity = "0";
			});

			setTimeout(function () {
				ghostSlide.remove();
			}, 850);

			return;
		}
		shiftSlides("next", true);
}

function movePrev() {
	var slides = getSlides();
	if (slides.length <= 4) return;

	var lastSlide = slides[slides.length - 1];
	if (!(lastSlide instanceof Node) || !(slides[0] instanceof Node)) return;

	// 前の商品をいったん左側へ配置する
	lastSlide.style.transition = "none";
	lastSlide.style.left = "-25%";
	lastSlide.style.opacity = "1";

	// 末尾の商品を先頭へ移動する
	group.insertBefore(lastSlide, slides[0]);

	// 左側に配置した状態をブラウザへ反映する
	lastSlide.offsetWidth;

	// 通常のcssへ戻すと、左側から先頭位置へ移動する
	lastSlide.style.transition = "";
	lastSlide.style.left = "";
	lastSlide.style.opacity = "";

	updateIndicators();
	requestPcLayoutAdjust();
}

// ドット移動用: 右回り(next)と同じく非アニメーションで並びを更新する
function movePrevInstant() {
		shiftSlides("prev", true);
}

function moveTo(targetIndex) {
	var slides = getSlides();
	if (!slides.length) return;

	var currentIndex = Number(slides[0].getAttribute("data-pc-index"));

	if (currentIndex === targetIndex) return;

	if (currentIndex < targetIndex) {
		var nextCount = targetIndex - currentIndex;
		for (var n = 0; n < nextCount; n++) {
			setTimeout(function () {
					shiftSlides("next", false);
			}, 200 * n);
		}
			setTimeout(function () {
				requestPcLayoutAdjust();
			}, 200 * Math.max(nextCount - 1, 0));
	} else {
		var prevCount = currentIndex - targetIndex;
		for (var p = 0; p < prevCount; p++) {
			setTimeout(function () {
					shiftSlides("prev", false);
			}, 200 * p);
		}
			setTimeout(function () {
				requestPcLayoutAdjust();
			}, 200 * Math.max(prevCount - 1, 0));
	}
}

function startAutoplay() {
	if (autoplayIntervalId) return;

	autoplayIntervalId = setInterval(function () {
		moveNext();
	}, 5000);
}

function stopAutoplay() {
	clearInterval(autoplayIntervalId);
	autoplayIntervalId = null;
}

	if (nextButton) {
		nextButton.addEventListener("click", function () {
			moveNext(true);
		});
	}

	if (prevButton) {
		prevButton.addEventListener("click", function () {
			movePrev();
		});
	}

	if (pauseButton) {
		pauseButton.addEventListener("click", function () {
			if (isPlaying) {
				stopAutoplay();
				pauseButton.classList.remove("pause");
				pauseButton.classList.add("triangle");
				pauseButton.setAttribute("aria-label", "自動再生を開始");
			} else {
				startAutoplay();
				pauseButton.classList.remove("triangle");
				pauseButton.classList.add("pause");
				pauseButton.setAttribute("aria-label", "自動再生を停止");
			}

			isPlaying = !isPlaying;
		});
	}

	createIndicators();
	updateIndicators();
	startAutoplay();
	requestPcLayoutAdjust();
}

document.addEventListener('DOMContentLoaded', function() {
	// requestAnimationFrameで束ねる高さ再計測関数を作成
	const requestSpHeightAdjust = createSpRootHeightAdjuster();
	const requestPcHeightAdjust = createPcRootHeightAdjuster();
	const selectedSourceItems = getRandomSourceItems(15);

	// 共通HTMLからSP用スライドを作る
	createSpItemsFromSource(selectedSourceItems);
	// 共通HTMLからPC用カードを作る
	createPcItemsFromSource(selectedSourceItems);

	// SP用カルーセルを準備する
	createSP1s3cSideImageCarousel();
	requestSpHeightAdjust();
	// PC用カルーセルを準備する
	createPc4SlideCarousel(requestPcHeightAdjust);
	requestPcHeightAdjust();
	// SP高さの再計測を行う各種トリガーを登録する
	setupSpHeightAdjustTriggers(requestSpHeightAdjust);
	// PC高さの再計測を行う各種トリガーを登録する
	setupPcHeightAdjustTriggers(requestPcHeightAdjust);

	console.log('カルーセルjs　PC4スライド、SP1スライド3ブロック ver.3');
});
