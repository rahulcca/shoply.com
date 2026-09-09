/* =========================================================
   SHOPLY — CART ENGINE
   File: public/js/cart.js
   ========================================================= */

(function () {
  "use strict";

  const CART_KEY = "shoplyCart";

  const $ = (selector) => document.querySelector(selector);

  /* ---------------------------------------------------------
     CART STORAGE
  --------------------------------------------------------- */

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch (error) {
      console.error("Shoply cart read error:", error);
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartCount();
  }

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */

  function getProductId(item) {
    return String(
      item.productId ||
      item._id ||
      item.id ||
      ""
    );
  }

  function formatPrice(price) {
    return "₹" + Number(price || 0).toLocaleString("en-IN");
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCartSubtotal() {
    return getCart().reduce((total, item) => {
      return total + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);
  }

  /* ---------------------------------------------------------
     CART COUNT
  --------------------------------------------------------- */

  function updateCartCount() {
    const cart = getCart();

    const count = cart.reduce((total, item) => {
      return total + Number(item.quantity || 1);
    }, 0);

    document.querySelectorAll(
      "#cartCount, .cart-count, [data-cart-count]"
    ).forEach((element) => {
      element.textContent = count;
      element.style.display = count > 0 ? "" : "";
    });
  }

  /* ---------------------------------------------------------
     ADD TO CART
  --------------------------------------------------------- */

  function addToCart(product, quantity = 1) {
    if (!product) return false;

    const productId = getProductId(product);

    if (!productId) {
      showToast("Product ID missing");
      return false;
    }

    const cart = getCart();

    const existing = cart.find(
      item => getProductId(item) === productId
    );

    const qty = Math.max(1, Number(quantity) || 1);

    if (existing) {
      existing.quantity =
        Number(existing.quantity || 0) + qty;
    } else {
      cart.push({
        productId: productId,
        _id: product._id || productId,
        id: product.id || productId,

        name:
          product.name ||
          product.title ||
          "Product",

        title:
          product.title ||
          product.name ||
          "Product",

        price: Number(product.price || 0),

        oldPrice:
          Number(product.oldPrice || product.comparePrice || 0),

        image:
          product.image ||
          product.imageUrl ||
          product.thumbnail ||
          "",

        category:
          product.category ||
          product.categoryName ||
          "",

        quantity: qty
      });
    }

    saveCart(cart);

    showToast("Added to cart 🛒");

    return true;
  }

  /* ---------------------------------------------------------
     REMOVE ITEM
  --------------------------------------------------------- */

  function removeFromCart(productId) {
    const cart = getCart();

    const updatedCart = cart.filter(
      item => getProductId(item) !== String(productId)
    );

    saveCart(updatedCart);

    renderCart();
  }

  /* ---------------------------------------------------------
     UPDATE QUANTITY
  --------------------------------------------------------- */

  function updateQuantity(productId, change) {
    const cart = getCart();

    const item = cart.find(
      product => getProductId(product) === String(productId)
    );

    if (!item) return;

    let quantity =
      Number(item.quantity || 1) + Number(change || 0);

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    item.quantity = quantity;

    saveCart(cart);

    renderCart();
  }

  function setQuantity(productId, quantity) {
    const cart = getCart();

    const item = cart.find(
      product => getProductId(product) === String(productId)
    );

    if (!item) return;

    quantity = Math.max(1, Number(quantity) || 1);

    item.quantity = quantity;

    saveCart(cart);

    renderCart();
  }

  /* ---------------------------------------------------------
     CART TOTALS
  --------------------------------------------------------- */

  function calculateTotals() {
    const subtotal = getCartSubtotal();

    const delivery =
      subtotal === 0
        ? 0
        : subtotal >= 999
          ? 0
          : 49;

    const total = subtotal + delivery;

    return {
      subtotal,
      delivery,
      total
    };
  }

  /* ---------------------------------------------------------
     RENDER CART
  --------------------------------------------------------- */

  function renderCart() {
    const container =
      $("#cartItems") ||
      $("#cartContainer") ||
      $(".cart-items");

    if (!container) return;

    const cart = getCart();

    if (!cart.length) {
      container.innerHTML = `
        <div class="empty-cart" style="
          text-align:center;
          padding:60px 20px;
        ">
          <div style="
            font-size:64px;
            margin-bottom:15px;
          ">🛒</div>

          <h2>Your cart is empty</h2>

          <p style="opacity:.7;margin:10px 0 25px;">
            Looks like you haven't added anything yet.
          </p>

          <a href="index.html" class="btn btn-primary">
            Start Shopping
          </a>
        </div>
      `;

      updateTotals();
      return;
    }

    container.innerHTML = cart.map(item => {
      const id = getProductId(item);

      const name =
        item.name ||
        item.title ||
        "Product";

      const image =
        item.image ||
        "images/placeholder.jpg";

      const price = Number(item.price || 0);

      const quantity =
        Number(item.quantity || 1);

      const itemTotal =
        price * quantity;

      return `
        <article class="cart-item" data-product-id="${escapeHTML(id)}">

          <div class="cart-item-image">
            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(name)}"
              onerror="this.style.opacity='.3'"
            >
          </div>

          <div class="cart-item-info">

            <div class="cart-item-category">
              ${escapeHTML(item.category || "SHOPLY")}
            </div>

            <h3>
              ${escapeHTML(name)}
            </h3>

            <div class="cart-item-price">
              ${formatPrice(price)}
            </div>

            <div class="cart-quantity">

              <button
                type="button"
                class="qty-btn"
                onclick="ShoplyCart.updateQuantity('${escapeHTML(id)}', -1)"
              >
                −
              </button>

              <span class="qty-value">
                ${quantity}
              </span>

              <button
                type="button"
                class="qty-btn"
                onclick="ShoplyCart.updateQuantity('${escapeHTML(id)}', 1)"
              >
                +
              </button>

            </div>

          </div>

          <div class="cart-item-right">

            <strong>
              ${formatPrice(itemTotal)}
            </strong>

            <button
              type="button"
              class="remove-cart"
              onclick="ShoplyCart.removeFromCart('${escapeHTML(id)}')"
              title="Remove item"
            >
              ✕
            </button>

          </div>

        </article>
      `;
    }).join("");

    updateTotals();
    updateCartCount();
  }

  /* ---------------------------------------------------------
     UPDATE TOTAL UI
  --------------------------------------------------------- */

  function updateTotals() {
    const totals = calculateTotals();

    const subtotalElements = document.querySelectorAll(
      "#cartSubtotal, [data-cart-subtotal]"
    );

    subtotalElements.forEach(element => {
      element.textContent =
        formatPrice(totals.subtotal);
    });

    const deliveryElements = document.querySelectorAll(
      "#deliveryFee, [data-delivery-fee]"
    );

    deliveryElements.forEach(element => {
      element.textContent =
        totals.delivery === 0
          ? "FREE"
          : formatPrice(totals.delivery);
    });

    const totalElements = document.querySelectorAll(
      "#cartTotal, [data-cart-total]"
    );

    totalElements.forEach(element => {
      element.textContent =
        formatPrice(totals.total);
    });

    const itemCountElements =
      document.querySelectorAll(
        "#cartItemCount, [data-cart-item-count]"
      );

    const count = getCart().reduce(
      (sum, item) =>
        sum + Number(item.quantity || 1),
      0
    );

    itemCountElements.forEach(element => {
      element.textContent = count;
    });
  }

  /* ---------------------------------------------------------
     TOAST
  --------------------------------------------------------- */

  function showToast(message) {
    let toast = document.getElementById("shoplyToast");

    if (!toast) {
      toast = document.createElement("div");

      toast.id = "shoplyToast";

      toast.style.cssText = `
        position:fixed;
        left:50%;
        bottom:30px;
        transform:translateX(-50%) translateY(20px);
        background:rgba(15,15,25,.95);
        color:#fff;
        padding:13px 22px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,.12);
        box-shadow:0 15px 45px rgba(0,0,0,.35);
        backdrop-filter:blur(15px);
        z-index:99999;
        opacity:0;
        pointer-events:none;
        transition:.3s ease;
        font-size:14px;
      `;

      document.body.appendChild(toast);
    }

    toast.textContent = message;

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform =
        "translateX(-50%) translateY(0)";
    });

    clearTimeout(window.shoplyToastTimer);

    window.shoplyToastTimer =
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform =
          "translateX(-50%) translateY(20px)";
      }, 2200);
  }

  /* ---------------------------------------------------------
     CHECKOUT
  --------------------------------------------------------- */

  function goToCheckout() {
    const cart = getCart();

    if (!cart.length) {
      showToast("Your cart is empty");
      return;
    }

    window.location.href = "checkout.html";
  }

  /* ---------------------------------------------------------
     CONTINUE SHOPPING
  --------------------------------------------------------- */

  function continueShopping() {
    window.location.href = "index.html";
  }

  /* ---------------------------------------------------------
     CLEAR CART CONFIRMATION
  --------------------------------------------------------- */

  function confirmClearCart() {
    const cart = getCart();

    if (!cart.length) {
      showToast("Cart is already empty");
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to remove all items from your cart?"
      );

    if (!confirmed) return;

    clearCart();
    renderCart();

    showToast("Cart cleared");
  }

  /* ---------------------------------------------------------
     CART INITIALIZATION
  --------------------------------------------------------- */

  function init() {
    updateCartCount();
    renderCart();

    document.addEventListener(
      "click",
      function (event) {

        const checkoutButton =
          event.target.closest(
            "[data-cart-checkout]"
          );

        if (checkoutButton) {
          event.preventDefault();
          goToCheckout();
        }

        const clearButton =
          event.target.closest(
            "[data-clear-cart]"
          );

        if (clearButton) {
          event.preventDefault();
          confirmClearCart();
        }

      }
    );

    window.addEventListener(
      "storage",
      function (event) {
        if (event.key === CART_KEY) {
          updateCartCount();
          renderCart();
        }
      }
    );
  }

  /* ---------------------------------------------------------
     GLOBAL API
  --------------------------------------------------------- */

  window.ShoplyCart = {

    getCart,
    saveCart,
    clearCart,

    addToCart,
    removeFromCart,

    updateQuantity,
    setQuantity,

    getCartSubtotal,
    calculateTotals,

    renderCart,
    updateTotals,
    updateCartCount,

    goToCheckout,
    continueShopping,
    confirmClearCart,

    showToast
  };

  /* ---------------------------------------------------------
     START
  --------------------------------------------------------- */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();