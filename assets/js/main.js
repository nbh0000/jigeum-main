(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  var header = document.getElementById('header');
  var state = { scrolled: false, mega: false };
  var paint = function () {
    header.classList.toggle('is-solid', state.scrolled || state.mega);
    header.classList.toggle('is-mega', state.mega);
  };

  // 헤더: 첫 화면 위쪽을 벗어나면 흰 바로 (스크롤 이벤트 대신 관찰자)
  var sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none;';
  document.body.prepend(sentinel);
  new IntersectionObserver(function (entries) {
    state.scrolled = !entries[0].isIntersecting;
    paint();
  }).observe(sentinel);

  // 히어로 영상: 데이터 절약·모션 감소 설정이면 포스터만
  var video = document.querySelector('.hero__video');
  var saveData = navigator.connection && navigator.connection.saveData;
  if (video && (saveData || reduceMotion.matches)) {
    video.removeAttribute('autoplay');
    video.pause();
    video.querySelectorAll('source').forEach(function (s) { s.remove(); });
    video.load();
  }

  // 메가메뉴 (마우스 기기)
  var gnb = document.querySelector('.gnb');
  var setMegaHeight = function () {
    var max = 0;
    document.querySelectorAll('.gnb__sub').forEach(function (s) { max = Math.max(max, s.offsetHeight); });
    header.style.setProperty('--mega-h', (max + 36) + 'px');
  };
  var openMega = function (open) { state.mega = open; paint(); };
  setMegaHeight();
  window.addEventListener('resize', setMegaHeight);
  if (document.fonts) document.fonts.ready.then(setMegaHeight);
  gnb.addEventListener('mouseenter', function () { if (finePointer.matches) openMega(true); });
  header.addEventListener('mouseleave', function () { openMega(false); });
  gnb.addEventListener('focusin', function () { openMega(true); });
  header.addEventListener('focusout', function (e) { if (!header.contains(e.relatedTarget)) openMega(false); });

  // 모바일 드로어
  var toggle = document.querySelector('.header__toggle');
  var drawer = document.getElementById('mnav');
  var main = document.getElementById('content');
  var lastFocus = null;
  var openDrawer = function () {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(function () { drawer.classList.add('is-open'); });
    toggle.setAttribute('aria-expanded', 'true');
    root.classList.add('is-locked');
    main.inert = true;
    drawer.querySelector('.drawer__close').focus();
  };
  var closeDrawer = function () {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-locked');
    main.inert = false;
    var done = function () { drawer.hidden = true; };
    if (reduceMotion.matches) done(); else setTimeout(done, 450);
    if (lastFocus) lastFocus.focus();
  };
  toggle.addEventListener('click', openDrawer);
  drawer.querySelectorAll('[data-close]').forEach(function (el) { el.addEventListener('click', closeDrawer); });
  drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeDrawer); });
  // 하나를 펼치면 다른 묶음은 접기
  var groups = drawer.querySelectorAll('.drawer__group');
  groups.forEach(function (g) {
    g.addEventListener('toggle', function () {
      if (g.open) groups.forEach(function (o) { if (o !== g) o.open = false; });
    });
  });
  // 태블릿에서 데스크톱 폭으로 넓어지면 드로어 닫기
  window.matchMedia('(min-width: 1101px)').addEventListener('change', function (e) { if (e.matches) closeDrawer(); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    openMega(false);
    closeDrawer();
  });

  // 핵심가치: 단어를 고르면 오른쪽 패널 교체
  var values = document.querySelectorAll('.value');
  var activate = function (li) {
    values.forEach(function (v) {
      var on = v === li;
      v.classList.toggle('is-active', on);
      v.querySelector('.value__word').setAttribute('aria-pressed', String(on));
    });
  };
  // 6초마다 다음 가치로. 밑줄이 남은 시간을 보여 줌. 직접 고르면 자동 넘김 끝
  var valuesSection = document.getElementById('values');
  var wide = window.matchMedia('(min-width: 901px)');
  var stopAuto = function () { valuesSection.classList.remove('is-auto', 'is-paused'); };
  var canAuto = !reduceMotion.matches;
  values.forEach(function (li, i) {
    var btn = li.querySelector('.value__word');
    btn.addEventListener('click', function () { stopAuto(); canAuto = false; activate(li); });
    btn.addEventListener('mouseenter', function () { if (finePointer.matches) { stopAuto(); canAuto = false; activate(li); } });
    btn.addEventListener('focus', function () { stopAuto(); canAuto = false; activate(li); });
    btn.addEventListener('animationend', function () {
      if (!valuesSection.classList.contains('is-auto')) return;
      activate(values[(i + 1) % values.length]);
    });
  });
  valuesSection.addEventListener('mouseenter', function () { valuesSection.classList.add('is-paused'); });
  valuesSection.addEventListener('mouseleave', function () { valuesSection.classList.remove('is-paused'); });
  new IntersectionObserver(function (entries) {
    var visible = entries[0].isIntersecting;
    if (visible && canAuto && wide.matches) valuesSection.classList.add('is-auto');
    else stopAuto();
  }, { threshold: 0.4 }).observe(valuesSection);

  // 변호사 슬라이더 + 진행 표시
  var track = document.getElementById('lawyerTrack');
  var bar = document.getElementById('lawyerProgress');
  var btns = document.querySelectorAll('.slider-btn');
  var updateTrack = function () {
    var max = track.scrollWidth - track.clientWidth;
    var visible = track.clientWidth / track.scrollWidth;
    var pos = max > 0 ? track.scrollLeft / max : 1;
    bar.parentElement.style.setProperty('--p', String(visible + (1 - visible) * pos));
    bar.style.setProperty('--p', String(visible + (1 - visible) * pos));
    btns[0].disabled = track.scrollLeft <= 2;
    btns[1].disabled = track.scrollLeft >= max - 2;
  };
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var card = track.querySelector('.lawyer');
      var step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
      track.scrollBy({ left: step * Number(b.dataset.dir), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  });
  track.addEventListener('scroll', updateTrack, { passive: true });
  new ResizeObserver(updateTrack).observe(track);
  updateTrack();

  // 성공사례 분야 필터 (모바일에서는 고른 탭을 가운데로)
  var tabs = document.querySelectorAll('.tab');
  var cases = document.querySelectorAll('.case');
  var empty = document.querySelector('.cases__empty');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) {
        x.classList.toggle('is-active', x === t);
        x.setAttribute('aria-selected', String(x === t));
      });
      var cat = t.dataset.cat;
      var shown = 0;
      cases.forEach(function (c) {
        var on = cat === 'all' || c.dataset.cat === cat;
        c.hidden = !on;
        if (on) shown++;
      });
      empty.hidden = shown > 0;
      if (t.parentElement.scrollWidth > t.parentElement.clientWidth) {
        t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    });
  });

  // 유튜브: 누를 때만 불러오기
  document.querySelectorAll('.yt').forEach(function (el) {
    el.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube.com/embed/' + el.dataset.id + '?autoplay=1&rel=0&playsinline=1';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.title = '법무법인 지금 소개 영상';
      el.appendChild(f);
    }, { once: true });
  });

  // 퀵메뉴: 상담 폼이나 푸터가 보이면 비켜 주기
  var quick = document.querySelector('.quick');
  var away = new Set();
  var awayIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) away.add(en.target); else away.delete(en.target); });
    quick.classList.toggle('is-away', away.size > 0);
  }, { threshold: 0.05 });
  awayIO.observe(document.getElementById('counselForm'));
  awayIO.observe(document.querySelector('.footer'));
  document.querySelector('.quick__top').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  // 개인정보 처리방침
  var modal = document.getElementById('privacy');
  document.querySelectorAll('[data-open="privacy"]').forEach(function (b) {
    b.addEventListener('click', function () { modal.showModal(); });
  });
  modal.querySelector('.modal__close').addEventListener('click', function () { modal.close(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });

  // 상담 폼 (시안: 운영 사이트 접수 연동 전)
  var form = document.getElementById('counselForm');
  var msg = form.querySelector('.form__msg');
  var say = function (text, isError) {
    msg.textContent = text;
    msg.classList.toggle('is-error', !!isError);
  };
  form.phone.setAttribute('enterkeyhint', 'next');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.name.value.trim()) { say('성함을 입력해 주십시오.', true); form.name.focus(); return; }
    if (!form.phone.value.trim()) { say('연락처를 입력해 주십시오.', true); form.phone.focus(); return; }
    if (!form.querySelector('[name="area"]:checked')) { say('상담분야를 선택해 주십시오.', true); return; }
    if (!form.agree.checked) { say('개인정보 처리방침에 동의해 주십시오.', true); return; }
    say('시안 화면이라 접수되지 않았습니다. 운영 사이트 연동 후 실제로 접수됩니다.', false);
  });
})();
