/* ภาพสไลด์พื้นหลังแบบสุ่ม (หน้าแรก + หัวหน้าค้นหา) — โหลดแบบ sync หลัง markup เพื่อเลือกภาพแรกก่อนแสดงผล */
(function () {
  var boxes = document.querySelectorAll('[data-slides]:not([data-ready])');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(boxes, function (box) {
    box.setAttribute('data-ready', '1');
    var slides = Array.prototype.slice.call(box.children).filter(function (x) { return x.tagName === 'FIGURE'; });
    if (!slides.length) return;
    var order = slides.map(function (_, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    var pos = 0;
    var eager = function (s) { var im = s && s.querySelector('img'); if (im && im.loading === 'lazy') im.loading = 'eager'; };
    var show = function (k) {
      slides.forEach(function (x) { x.classList.remove('on'); });
      eager(slides[order[k]]); slides[order[k]].classList.add('on');
      eager(slides[order[(k + 1) % order.length]]);
    };
    box.classList.add('js');
    show(0);
    if (reduce || slides.length < 2) return;
    var tick = function () { pos = (pos + 1) % order.length; show(pos); };
    var timer = setInterval(tick, 6500);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearInterval(timer); timer = null; } else if (!timer) timer = setInterval(tick, 6500);
    });
  });
})();
