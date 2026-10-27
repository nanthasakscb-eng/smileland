/* หน้าแรก: สไลด์ภาพพื้นหลังแบบสุ่ม — โหลดแบบ sync ทันทีหลัง markup เพื่อเลือกภาพแรกก่อนแสดงผล */
(function () {
  var box = document.getElementById('hero-slides');
  if (!box) return;
  var slides = Array.prototype.slice.call(box.querySelectorAll('.hero-slide'));
  if (!slides.length) return;
  // สุ่มลำดับ (Fisher–Yates)
  var order = slides.map(function (_, i) { return i; });
  for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
  var pos = 0;
  var show = function (k) {
    var s = slides[order[k]];
    var img = s.querySelector('img');
    if (img && img.loading === 'lazy') img.loading = 'eager';
    slides.forEach(function (x) { x.classList.remove('on'); });
    s.classList.add('on');
    // โหลดภาพถัดไปล่วงหน้า
    var nx = slides[order[(k + 1) % order.length]].querySelector('img');
    if (nx && nx.loading === 'lazy') nx.loading = 'eager';
  };
  box.classList.add('js');
  show(0);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || slides.length < 2) return;
  var timer = setInterval(function () { pos = (pos + 1) % order.length; show(pos); }, 6500);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearInterval(timer); timer = null; }
    else if (!timer) timer = setInterval(function () { pos = (pos + 1) % order.length; show(pos); }, 6500);
  });
})();
