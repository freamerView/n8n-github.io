(function () {
  const catalogGrid = document.getElementById('catalogGrid');
  const productModal = document.getElementById('productModal');
  const modalContent = document.getElementById('modalContent');
  const modalClose = document.getElementById('modalClose');
  const cartBtn = document.getElementById('cartBtn');
  const cartWrap = document.getElementById('cartWrap');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartBody = document.getElementById('cartBody');
  const cartClose = document.getElementById('cartClose');
  const cartCount = document.getElementById('cartCount');
  const cartForm = document.getElementById('cartForm');
  const orderItemsInput = document.getElementById('orderItemsInput');

  const CART_KEY = 'n8n_templates_cart';

  function getCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return raw.map(function (it) { return { id: it.id, name: it.name, price: it.price, quantity: 1 }; });
    } catch {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartCount();
  }

  function updateCartCount() {
    if (!cartCount) return;
    const cart = getCart();
    const total = cart.reduce((sum, it) => sum + (it.quantity || 1), 0);
    cartCount.textContent = total;
  }

  function formatPrice(n) {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
  }

  function getCartQuantity(productId) {
    var item = getCart().find(function (it) { return it.id === productId; });
    return item ? (item.quantity || 1) : 0;
  }

  function getCurrentFilter() {
    var active = document.querySelector('.filter-btn.active');
    return (active && active.dataset.category) ? active.dataset.category : 'all';
  }

  function getCurrentPriceRange() {
    var minEl = document.getElementById('priceMin');
    var maxEl = document.getElementById('priceMax');
    var min = minEl && minEl.value !== '' ? parseInt(minEl.value, 10) : null;
    var max = maxEl && maxEl.value !== '' ? parseInt(maxEl.value, 10) : null;
    if (min !== null && isNaN(min)) min = null;
    if (max !== null && isNaN(max)) max = null;
    return { min: min, max: max };
  }

  function renderCatalog(filter, priceRange) {
    if (!catalogGrid) return;
    if (filter === undefined) filter = getCurrentFilter();
    if (priceRange === undefined) priceRange = getCurrentPriceRange();
    var list = filter === 'all' ? PRODUCTS : PRODUCTS.filter(function (p) { return p.category === filter; });
    list = list.filter(function (p) {
      if (priceRange.min !== null && p.price < priceRange.min) return false;
      if (priceRange.max !== null && p.price > priceRange.max) return false;
      return true;
    });
    catalogGrid.innerHTML = list.map(function (product) {
      var qty = getCartQuantity(product.id);
      var inCart = qty > 0;
      return (
        '<article class="card ' + (inCart ? 'card-in-cart' : '') + '" data-id="' + product.id + '">' +
        '<div class="card-image-wrap">' +
        '<img src="' + product.image + '" alt="' + product.name + '" class="card-image" loading="lazy" data-fallback="' + (typeof DEFAULT_IMAGE !== 'undefined' ? DEFAULT_IMAGE : '') + '" onerror="if(this.dataset.fallback){this.onerror=null;this.src=this.dataset.fallback}">' +
        '</div>' +
        '<div class="card-body">' +
        '<h3 class="card-title">' + product.name + '</h3>' +
        '<p class="card-price">' + formatPrice(product.price) + '</p>' +
        '<div class="card-actions">' +
        '<button type="button" class="btn btn-outline card-btn" data-open-product="' + product.id + '">Подробнее</button>' +
        '<span class="card-in-cart-label">' + (inCart ? 'В корзине' : '') + '</span>' +
        '<button type="button" class="card-add-btn ' + (inCart ? 'card-add-btn-in-cart' : '') + '" data-cart-toggle="' + product.id + '" data-in-cart="' + (inCart ? '1' : '0') + '" aria-label="' + (inCart ? 'Убрать из корзины' : 'Добавить в корзину') + '" title="' + (inCart ? 'Убрать из корзины' : 'Добавить в корзину') + '">' + (inCart ? '−' : '+') + '</button>' +
        '</div>' +
        '</div>' +
        '</article>'
      );
    }).join('');

    catalogGrid.querySelectorAll('[data-open-product]').forEach(btn => {
      btn.addEventListener('click', () => openProduct(Number(btn.dataset.openProduct)));
    });
    catalogGrid.querySelectorAll('[data-cart-toggle]').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = Number(this.dataset.cartToggle);
        if (this.dataset.inCart === '1') {
          removeFromCart(id);
        } else {
          addToCart(id);
        }
        renderCatalog();
        renderCart();
      });
    });
  }

  function getSimilarProducts(product, limit) {
    return PRODUCTS
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, limit);
  }

  function openProduct(id) {
    if (!productModal || !modalContent) return;
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return;
    var modalImgFallback = typeof DEFAULT_IMAGE !== 'undefined' ? DEFAULT_IMAGE : '';
    var similar = getSimilarProducts(product, 4);
    var similarHtml = similar.length > 0 ? `
      <div class="modal-similar">
        <h3 class="modal-similar-title">Похожие шаблоны</h3>
        <div class="modal-similar-list">
          ${similar.map(p => `
            <div class="modal-similar-item">
              <a href="#" data-open-product="${p.id}" aria-label="${p.name}">
                <img src="${p.image}" alt="" loading="lazy" data-fallback="${modalImgFallback}" onerror="if(this.dataset.fallback){this.onerror=null;this.src=this.dataset.fallback}">
                <span>${p.name}</span>
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';
    var inCart = getCartQuantity(product.id) > 0;
    var cartStatusHtml = inCart ? '<p class="modal-product-in-cart">В корзине</p>' : '';
    var modalBtnClass = inCart ? 'btn btn-remove-from-cart' : 'btn btn-primary';
    var modalBtnText = inCart ? 'Убрать из корзины' : 'Добавить в корзину';
    var categoryLabels = { telegram: 'Telegram', sheets: 'Google Sheets', forms: 'Формы', crm: 'CRM', notifications: 'Уведомления', parsing: 'Парсинг', automation: 'Автоматизация', social: 'Соцсети' };
    var categoryName = (product.category && categoryLabels[product.category]) ? categoryLabels[product.category] : product.category || '';
    var categoryHtml = categoryName ? '<p class="modal-product-category">Категория: <span class="modal-product-category-name">' + categoryName + '</span></p>' : '';
    modalContent.innerHTML = `
      <div class="modal-product">
        <div class="modal-product-image">
          <img src="${product.image}" alt="${product.name}" data-fallback="${modalImgFallback}" onerror="if(this.dataset.fallback){this.onerror=null;this.src=this.dataset.fallback}">
        </div>
        <div class="modal-product-info">
          <h2 id="modalTitle" class="modal-product-title">${product.name}</h2>
          ${categoryHtml}
          <div class="modal-product-desc">${product.description}</div>
          <p class="modal-product-price">${formatPrice(product.price)}</p>
          ${cartStatusHtml}
          <button type="button" class="${modalBtnClass}" data-cart-action="${product.id}" data-in-cart="${inCart ? '1' : '0'}">${modalBtnText}</button>
        </div>
      </div>
      ${similarHtml}
    `;
    modalContent.querySelector('[data-cart-action]').addEventListener('click', function () {
      if (this.dataset.inCart === '1') {
        removeFromCart(product.id);
      } else {
        addToCart(product.id);
      }
      productModal.classList.remove('open');
      document.body.style.overflow = '';
      renderCatalog();
      renderCart();
    });
    modalContent.querySelectorAll('[data-open-product]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openProduct(Number(this.dataset.openProduct));
      });
    });
    productModal.classList.add('open');
    productModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (productModal) {
      productModal.classList.remove('open');
      productModal.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
  }

  function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const cart = getCart();
    if (cart.some(it => it.id === productId)) return;
    cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1 });
    setCart(cart);
  }

  function removeFromCart(productId) {
    setCart(getCart().filter(it => it.id !== productId));
  }

  function getDiscountPercent(totalQuantity) {
    if (totalQuantity >= 10) return 25;
    if (totalQuantity >= 8) return 20;
    if (totalQuantity >= 6) return 15;
    if (totalQuantity >= 4) return 10;
    if (totalQuantity >= 2) return 5;
    return 0;
  }

  function getNextDiscountHint(totalQty) {
    if (totalQty >= 10) return null;
    if (totalQty >= 8) return { need: 10 - totalQty, nextPercent: 25 };
    if (totalQty >= 6) return { need: 8 - totalQty, nextPercent: 20 };
    if (totalQty >= 4) return { need: 6 - totalQty, nextPercent: 15 };
    if (totalQty >= 2) return { need: 4 - totalQty, nextPercent: 10 };
    if (totalQty >= 1) return { need: 2 - totalQty, nextPercent: 5 };
    return { need: 2, nextPercent: 5 };
  }

  function pluralGoods(n) {
    if (n === 1) return '1 товар';
    if (n >= 2 && n <= 4) return n + ' товара';
    return n + ' товаров';
  }

  function renderCart() {
    if (!cartBody) return;
    const cart = getCart();
    if (cart.length === 0) {
      cartBody.innerHTML = '<p class="cart-empty">Корзина пуста</p>';
      var orderTotalInput = document.getElementById('orderTotalInput');
      var orderDiscountInput = document.getElementById('orderDiscountInput');
      if (orderTotalInput) orderTotalInput.value = '';
      if (orderDiscountInput) orderDiscountInput.value = '';
      return;
    }
    var totalQty = 0;
    var subtotal = 0;
    cartBody.innerHTML = cart.map(item => {
      const product = PRODUCTS.find(p => p.id === item.id);
      const name = product ? product.name : item.name;
      const price = item.price || (product && product.price);
      const qty = item.quantity || 1;
      const sum = price * qty;
      totalQty += qty;
      subtotal += sum;
      return `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-info">
            <span class="cart-item-name">${name}</span>
            <span class="cart-item-qty">${qty} × ${formatPrice(price)}</span>
          </div>
          <div class="cart-item-right">
            <span class="cart-item-sum">${formatPrice(sum)}</span>
            <button type="button" class="cart-item-remove" data-remove="${item.id}" aria-label="Удалить">×</button>
          </div>
        </div>
      `;
    }).join('');

    var discountPercent = getDiscountPercent(totalQty);
    var discountAmount = Math.round(subtotal * discountPercent / 100);
    var total = subtotal - discountAmount;

    var nextHint = getNextDiscountHint(totalQty);
    var totalsHtml = '<div class="cart-totals">';
    totalsHtml += '<div class="cart-totals-row"><span>Сумма</span><span>' + formatPrice(subtotal) + '</span></div>';
    if (discountPercent > 0) {
      totalsHtml += '<div class="cart-totals-row cart-totals-discount"><span>Скидка ' + discountPercent + '%</span><span>−' + formatPrice(discountAmount) + '</span></div>';
    }
    totalsHtml += '<div class="cart-totals-row cart-totals-total"><span>Итого</span><span>' + formatPrice(total) + '</span></div>';
    if (nextHint && nextHint.need > 0) {
      totalsHtml += '<p class="cart-totals-hint">Ещё ' + pluralGoods(nextHint.need) + ' до скидки ' + nextHint.nextPercent + '%</p>';
    }
    totalsHtml += '</div>';
    cartBody.insertAdjacentHTML('beforeend', totalsHtml);

    cartBody.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.remove);
        const newCart = getCart().filter(it => it.id !== id);
        setCart(newCart);
        renderCart();
        if (catalogGrid) renderCatalog();
      });
    });

    const orderText = cart.map(it => {
      const p = PRODUCTS.find(x => x.id === it.id);
      return `${p ? p.name : it.name} — ${it.quantity || 1} шт. × ${formatPrice(it.price || (p && p.price))}`;
    }).join('\n');
    if (orderItemsInput) orderItemsInput.value = orderText;

    var orderTotalInput = document.getElementById('orderTotalInput');
    var orderDiscountInput = document.getElementById('orderDiscountInput');
    if (orderTotalInput) orderTotalInput.value = formatPrice(total);
    if (orderDiscountInput) orderDiscountInput.value = discountPercent > 0 ? discountPercent + '% (−' + formatPrice(discountAmount) + ')' : '';
  }

  function openCart() {
    renderCart();
    if (cartWrap) cartWrap.classList.add('open');
    if (cartOverlay) cartOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    if (cartWrap) cartWrap.classList.remove('open');
    if (cartOverlay) cartOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (catalogGrid) renderCatalog();
  }

  if (catalogGrid) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCatalog();
      });
    });
    var priceMinEl = document.getElementById('priceMin');
    var priceMaxEl = document.getElementById('priceMax');
    function applyPriceAndRender() { renderCatalog(); }
    if (priceMinEl) { priceMinEl.addEventListener('input', applyPriceAndRender); priceMinEl.addEventListener('change', applyPriceAndRender); }
    if (priceMaxEl) { priceMaxEl.addEventListener('input', applyPriceAndRender); priceMaxEl.addEventListener('change', applyPriceAndRender); }
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (productModal) productModal.addEventListener('click', (e) => { if (e.target === productModal) closeModal(); });
  if (cartBtn) cartBtn.addEventListener('click', function (e) { e.preventDefault(); openCart(); });
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', (e) => { if (e.target === cartOverlay) closeCart(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeCart();
    }
  });

  if (cartForm) {
    cartForm.addEventListener('submit', function (e) {
      const cart = getCart();
      if (cart.length === 0) {
        e.preventDefault();
        alert('Добавьте товары в корзину.');
        return;
      }
      var orderTotalInput = document.getElementById('orderTotalInput');
      var orderDiscountInput = document.getElementById('orderDiscountInput');
      var totalQty = cart.reduce(function (sum, it) { return sum + (it.quantity || 1); }, 0);
      var subtotal = 0;
      cart.forEach(function (item) {
        var p = PRODUCTS.find(function (x) { return x.id === item.id; });
        var price = item.price || (p && p.price) || 0;
        subtotal += price * (item.quantity || 1);
      });
      var discountPercent = getDiscountPercent(totalQty);
      var discountAmount = Math.round(subtotal * discountPercent / 100);
      var total = subtotal - discountAmount;
      if (orderTotalInput) orderTotalInput.value = formatPrice(total);
      if (orderDiscountInput) orderDiscountInput.value = discountPercent > 0 ? discountPercent + '% (−' + formatPrice(discountAmount) + ')' : '—';
      setTimeout(function () {
        setCart([]);
        renderCart();
        if (catalogGrid) renderCatalog();
      }, 100);
    });
  }

  if (catalogGrid) renderCatalog();
  updateCartCount();

  var hero = document.getElementById('hero');
  if (hero) {
    var heroTargetX = 0.5, heroTargetY = 0.5, heroCurrentX = 0.5, heroCurrentY = 0.5, heroTicking = false;
    function heroTick() {
      heroCurrentX += (heroTargetX - heroCurrentX) * 0.08;
      heroCurrentY += (heroTargetY - heroCurrentY) * 0.08;
      hero.style.setProperty('--mouse-x', heroCurrentX);
      hero.style.setProperty('--mouse-y', heroCurrentY);
      if (Math.abs(heroCurrentX - heroTargetX) > 0.001 || Math.abs(heroCurrentY - heroTargetY) > 0.001) requestAnimationFrame(heroTick);
      else heroTicking = false;
    }
    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      heroTargetX = (e.clientX - rect.left) / rect.width;
      heroTargetY = (e.clientY - rect.top) / rect.height;
      if (!heroTicking) { heroTicking = true; requestAnimationFrame(heroTick); }
    });
    hero.addEventListener('mouseleave', function () {
      heroTargetX = 0.5; heroTargetY = 0.5;
      if (!heroTicking) { heroTicking = true; requestAnimationFrame(heroTick); }
    });
  }

  (function initReviews() {
    var reviewsGrid = document.getElementById('reviewsGrid');
    if (!reviewsGrid) return;
    var REVIEWS = [
      { id: 1, text: 'Взял шаблон рассылки в Telegram — за полчаса настроил под свой канал. Рекомендую.', author: 'Максим' },
      { id: 2, text: 'Парсинг в Sheets сработал из коробки. Сэкономил кучу времени на ручном сборе.', author: 'Анна К.' },
      { id: 3, text: 'Обработка заявок с формы — именно то, что искал. Telegram + таблица + почта.', author: 'Дмитрий' },
      { id: 4, text: 'Удобно, что есть описание и подсказки. Разобрался без поддержки.', author: 'Олег В.' },
      { id: 5, text: 'Взял три шаблона разом. Все импортировались в n8n без косяков.', author: 'Елена' },
      { id: 6, text: 'Мониторинг сайтов настроил за десять минут. Алерты приходят сразу.', author: 'Игорь' },
      { id: 7, text: 'Дашборд уведомлений — теперь вижу сводку по заявкам не открывая CRM.', author: 'Татьяна' },
      { id: 8, text: 'Лиды из рекламы сразу в amoCRM. Ни одной потери.', author: 'Алексей' },
      { id: 9, text: 'Бэкап в облако по расписанию работает тихо. Спасибо за шаблон.', author: 'Сергей' },
      { id: 10, text: 'Вебхук-маршрутизатор заменил кучу отдельных интеграций. Один endpoint.', author: 'Михаил' }
    ];
    var SLOT_COUNT = 6;
    var slots = [];
    var timerIds = [];

    function randomDuration() {
      return 5000 + Math.random() * 5000;
    }

    function getVisibleIdsExcept(skipIndex) {
      var ids = {};
      for (var i = 0; i < SLOT_COUNT; i++) {
        if (i === skipIndex) continue;
        var slot = slots[i];
        if (slot && slot.reviewId) ids[slot.reviewId] = true;
      }
      return ids;
    }

    function pickNextReview(skipIndex) {
      var visible = getVisibleIdsExcept(skipIndex);
      var available = REVIEWS.filter(function (r) { return !visible[r.id]; });
      if (available.length === 0) available = REVIEWS;
      return available[Math.floor(Math.random() * available.length)];
    }

    function createDots() {
      var overlay = document.createElement('div');
      overlay.className = 'review-shatter-overlay';
      var count = 40;
      for (var i = 0; i < count; i++) {
        var dot = document.createElement('div');
        dot.className = 'review-dot';
        dot.style.left = (8 + Math.random() * 84) + '%';
        dot.style.top = (8 + Math.random() * 84) + '%';
        dot.style.setProperty('--dx', (Math.random() - 0.5) * 180 + 'px');
        dot.style.setProperty('--dy', (Math.random() - 0.5) * 180 + 'px');
        overlay.appendChild(dot);
      }
      return overlay;
    }

    function shatterAndReplace(slotIndex) {
      var slot = slots[slotIndex];
      if (!slot || !slot.cardEl) return;
      var card = slot.cardEl;
      if (card.classList.contains('review-card-shattering')) return;
      if (slot.timerId) {
        clearTimeout(slot.timerId);
        slot.timerId = null;
      }
      card.classList.add('review-card-shattering');
      card.appendChild(createDots());
      setTimeout(function () {
        var next = pickNextReview(slotIndex);
        var duration = randomDuration();
        var newCard = document.createElement('article');
        newCard.className = 'review-card';
        newCard.setAttribute('data-review-id', next.id);
        newCard.innerHTML = '<div class="review-card-content"><p class="review-text">' + next.text + '</p><span class="review-author">' + next.author + '</span></div><div class="review-timer"><div class="review-timer-fill"></div></div>';
        newCard.style.setProperty('--timer-duration', duration + 'ms');
        newCard.addEventListener('click', function (e) {
          e.stopPropagation();
          shatterAndReplace(slotIndex);
        });
        slot.cardEl = newCard;
        slot.reviewId = next.id;
        requestAnimationFrame(function () {
          newCard.classList.add('review-timer-active');
          slot.timerId = setTimeout(function () { shatterAndReplace(slotIndex); }, duration);
        });
        slot.container.innerHTML = '';
        slot.container.appendChild(newCard);
      }, 580);
    }

    function buildCard(slotIndex, review, startDelay) {
      var duration = Math.round(5000 + Math.random() * 5000);
      var card = document.createElement('article');
      card.className = 'review-card';
      card.setAttribute('data-review-id', review.id);
      card.innerHTML = '<div class="review-card-content"><p class="review-text">' + review.text + '</p><span class="review-author">' + review.author + '</span></div><div class="review-timer"><div class="review-timer-fill"></div></div>';
      card.style.setProperty('--timer-duration', duration + 'ms');
      card.addEventListener('click', function (e) {
        e.stopPropagation();
        shatterAndReplace(slotIndex);
      });
      var container = document.createElement('div');
      container.className = 'review-slot';
      container.appendChild(card);
      slots[slotIndex] = { container: container, cardEl: card, reviewId: review.id, timerId: null };
      var startTimer = function () {
        card.classList.add('review-timer-active');
        slots[slotIndex].timerId = setTimeout(function () { shatterAndReplace(slotIndex); }, duration);
      };
      if (startDelay && startDelay > 0) {
        setTimeout(startTimer, startDelay);
      } else {
        requestAnimationFrame(function () { startTimer(); });
      }
      return container;
    }

    var used = {};
    for (var i = 0; i < SLOT_COUNT; i++) {
      var available = REVIEWS.filter(function (r) { return !used[r.id]; });
      if (available.length === 0) used = {};
      var review = available[Math.floor(Math.random() * (available.length || 1))];
      used[review.id] = true;
      reviewsGrid.appendChild(buildCard(i, review, i * 320));
    }
  })();

  var cursorGlow = document.getElementById('cursorGlow');
  if (cursorGlow) {
    var gx = 0, gy = 0;
    document.addEventListener('mousemove', function (e) {
      gx = e.clientX;
      gy = e.clientY;
    });
    function cursorTick() {
      cursorGlow.style.left = gx + 'px';
      cursorGlow.style.top = gy + 'px';
      requestAnimationFrame(cursorTick);
    }
    requestAnimationFrame(cursorTick);
  }
})();
