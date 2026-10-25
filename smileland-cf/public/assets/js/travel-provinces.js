(() => {
  const choices = [...document.querySelectorAll('[data-province-choice]')];
  const articles = [...document.querySelectorAll('[data-travel-province]')];
  function selectProvince() {
    if (!articles.length) return;
    const slug = location.hash.startsWith('#province-') ? location.hash.slice(10) : 'all';
    const choice = choices.find(el => el.dataset.provinceChoice === slug) || choices[0];
    const selected = choice?.dataset.provinceChoice || 'all';
    document.querySelector('[data-travel-result]')?.classList.toggle('ut-hub-single', selected !== 'all');
    choices.forEach(el => {
      const active = el === choice;
      el.classList.toggle('selected', active);
      if (active) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
    });
    articles.forEach(el => { el.hidden = selected !== 'all' && el.dataset.travelProvince !== selected; });
    const count=document.querySelector('[data-travel-count]');
    if(count)count.textContent=selected==='all'?'20 บทความ · จังหวัดละ 10 ที่เที่ยว':`${choice.dataset.provinceName} · 10 ที่เที่ยวแนะนำ`;
  }
  window.addEventListener('hashchange', selectProvince);
  selectProvince();
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.travel-nav[open]').forEach(el => { el.open = false; el.querySelector('summary')?.focus(); });
  });
  document.addEventListener('click', event => {
    document.querySelectorAll('.travel-nav[open]').forEach(el => {
      if (!el.contains(event.target) || event.target.closest('a')) el.open = false;
    });
  });
})();
