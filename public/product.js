"use strict";

/*
========================================
SHOPLY PRODUCT ENGINE
========================================
Product API
Product Details
Add To Cart
Buy Now
Quantity
URL ?id=
========================================
*/

(() => {

  let currentProduct = null;


  /* =====================================
     HELPERS
  ===================================== */

  function getProductId() {

    const params =
      new URLSearchParams(window.location.search);

    return (
      params.get("id") ||
      params.get("productId") ||
      ""
    );

  }


  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function money(value) {

    const amount = Number(value || 0);

    return "₹" + amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2
    });

  }


  function getImage(product) {

    return (
      product.image ||
      product.imageUrl ||
      product.thumbnail ||
      product.photo ||
      "images/product.jpg"
    );

  }


  function getPrice(product) {

    return Number(
      product.price ??
      product.salePrice ??
      product.amount ??
      0
    );

  }


  function getOldPrice(product) {

    return Number(
      product.oldPrice ??
      product.originalPrice ??
      product.mrp ??
      0
    );

  }


  function getStock(product) {

    if (product.stock !== undefined) {
      return Number(product.stock);
    }

    if (product.quantity !== undefined) {
      return Number(product.quantity);
    }

    if (product.inventory !== undefined) {
      return Number(product.inventory);
    }

    return 999;

  }


  /* =====================================
     FIND PRODUCT IN API RESPONSE
  ===================================== */

  function findProduct(data, id) {

    if (!data) return null;


    if (
      data._id &&
      String(data._id) === String(id)
    ) {
      return data;
    }


    if (
      data.id &&
      String(data.id) === String(id)
    ) {
      return data;
    }


    if (data.product) {

      if (
        String(data.product._id) === String(id) ||
        String(data.product.id) === String(id)
      ) {
        return data.product;
      }

    }


    const arrays = [

      data.products,

      data.data,

      data.items

    ];


    for (const array of arrays) {

      if (!Array.isArray(array)) {
        continue;
      }


      const found =
        array.find(product => {

          return (
            String(product._id) === String(id) ||
            String(product.id) === String(id)
          );

        });


      if (found) {
        return found;
      }

    }


    return null;

  }


  /* =====================================
     API LOAD
  ===================================== */

  async function loadProduct() {

    const id = getProductId();


    if (!id) {

      showError(
        "No product was selected. Please open a product from the Shoply products section."
      );

      return;

    }


    try {

      const response =
        await fetch("/api/products");


      if (!response.ok) {

        throw new Error(
          "Product API failed"
        );

      }


      const data =
        await response.json();


      const product =
        findProduct(data, id);


      if (!product) {

        showError(
          "This product does not exist or may have been removed."
        );

        return;

      }


      currentProduct =
        product;


      renderProduct(product);


    } catch (error) {

      console.error(
        "Shoply Product Error:",
        error
      );


      showError(
        "Unable to load this product. Please make sure the Shoply server is running."
      );

    }

  }


  /* =====================================
     RENDER PRODUCT
  ===================================== */

  function renderProduct(product) {

    const title =
      product.name ||
      product.title ||
      "Shoply Product";


    const category =
      product.category?.name ||
      product.categoryName ||
      product.category ||
      "Product";


    const description =
      product.description ||
      product.details ||
      "Premium quality product available at Shoply.";


    const price =
      getPrice(product);


    const oldPrice =
      getOldPrice(product);


    const image =
      getImage(product);


    const stock =
      getStock(product);


    /* TITLE */

    document.title =
      title + " — Shoply";


    /* IMAGE */

    const imageElement =
      document.getElementById(
        "productImage"
      );


    imageElement.src =
      image;


    imageElement.alt =
      title;


    imageElement.onerror =
      function() {

        this.src =
          "images/product.jpg";

      };


    /* CATEGORY */

    document.getElementById(
      "productCategory"
    ).textContent =
      category;


    /* TITLE */

    document.getElementById(
      "productTitle"
    ).textContent =
      title;


    /* BREADCRUMB */

    document.getElementById(
      "breadcrumbProduct"
    ).textContent =
      title;


    /* DESCRIPTION */

    document.getElementById(
      "productDescription"
    ).textContent =
      description;


    /* PRICE */

    document.getElementById(
      "productPrice"
    ).textContent =
      money(price);


    /* OLD PRICE */

    const oldPriceElement =
      document.getElementById(
        "productOldPrice"
      );


    const discountElement =
      document.getElementById(
        "productDiscount"
      );


    if (
      oldPrice > price &&
      price > 0
    ) {

      oldPriceElement.textContent =
        money(oldPrice);

      oldPriceElement.style.display =
        "block";


      const discount =
        Math.round(
          ((oldPrice - price) /
            oldPrice) * 100
        );


      discountElement.textContent =
        discount + "% OFF";

      discountElement.style.display =
        "block";

    } else {

      oldPriceElement.style.display =
        "none";

      discountElement.style.display =
        "none";

    }


    /* BADGE */

    const badge =
      document.getElementById(
        "productBadge"
      );


    if (product.badge) {

      badge.textContent =
        product.badge;

    } else if (product.featured) {

      badge.textContent =
        "Featured";

    } else {

      badge.textContent =
        "SHOPLY";

    }


    /* RATING */

    const rating =
      Number(
        product.rating ||
        product.averageRating ||
        0
      );


    const reviewCount =
      Number(
        product.reviewCount ||
        product.reviewsCount ||
        (Array.isArray(product.reviews)
          ? product.reviews.length
          : 0)
      );


    const stars =
      document.getElementById(
        "productStars"
      );


    const ratingText =
      document.getElementById(
        "productRatingText"
      );


    if (rating > 0) {

      const rounded =
        Math.max(
          0,
          Math.min(
            5,
            Math.round(rating)
          )
        );


      stars.textContent =
        "★".repeat(rounded) +
        "☆".repeat(5 - rounded);


      ratingText.textContent =
        rating.toFixed(1) +
        " / 5 • " +
        reviewCount +
        " review" +
        (reviewCount === 1 ? "" : "s");

    } else {

      stars.textContent =
        "☆☆☆☆☆";

      ratingText.textContent =
        "No reviews yet";

    }


    /* STOCK */

    const stockElement =
      document.getElementById(
        "productStock"
      );


    const stockDot =
      stockElement.querySelector(
        ".stock-dot"
      );


    const addButton =
      document.getElementById(
        "addToCart"
      );


    const buyButton =
      document.getElementById(
        "buyNow"
      );


    if (stock <= 0) {

      stockElement.innerHTML = `
        <span class="stock-dot out"></span>
        Out of Stock
      `;


      addButton.disabled =
        true;


      buyButton.disabled =
        true;


    } else if (stock <= 5) {

      stockElement.innerHTML = `
        <span class="stock-dot"></span>
        Only ${stock} left in stock
      `;


      addButton.disabled =
        false;


      buyButton.disabled =
        false;


    } else {

      stockElement.innerHTML = `
        <span class="stock-dot"></span>
        In Stock
      `;


      addButton.disabled =
        false;


      buyButton.disabled =
        false;

    }


    /* SHOW PAGE */

    document.getElementById(
      "productLoading"
    ).style.display =
      "none";


    document.getElementById(
      "productLayout"
    ).style.display =
      "grid";


    document.getElementById(
      "productError"
    ).classList.remove(
      "show"
    );


    /* REFRESH CART */

    updateCartCount();

  }


  /* =====================================
     ERROR
  ===================================== */

  function showError(message) {

    document.getElementById(
      "productLoading"
    ).style.display =
      "none";


    document.getElementById(
      "productLayout"
    ).style.display =
      "none";


    const errorBox =
      document.getElementById(
        "productError"
      );


    const errorText =
      document.getElementById(
        "productErrorText"
      );


    errorText.textContent =
      message;


    errorBox.classList.add(
      "show"
    );

  }


  /* =====================================
     CART
  ===================================== */

  function getCart() {

    try {

      const cart =
        JSON.parse(
          localStorage.getItem(
            "shoplyCart"
          ) || "[]"
        );


      return Array.isArray(cart)
        ? cart
        : [];

    } catch {

      return [];

    }

  }


  function saveCart(cart) {

    localStorage.setItem(
      "shoplyCart",
      JSON.stringify(cart)
    );


    updateCartCount();

  }


  function getProductIdValue(product) {

    return (
      product._id ||
      product.id ||
      product.productId
    );

  }


  function addToCart(quantity = 1) {

    if (!currentProduct) {

      showToast(
        "Product is still loading..."
      );

      return false;

    }


    const stock =
      getStock(currentProduct);


    if (stock <= 0) {

      showToast(
        "This product is out of stock."
      );

      return false;

    }


    quantity =
      Math.max(
        1,
        Number(quantity) || 1
      );


    if (quantity > stock) {

      quantity =
        stock;

    }


    const productId =
      getProductIdValue(
        currentProduct
      );


    const cart =
      getCart();


    const existingIndex =
      cart.findIndex(item => {

        return String(
          item.productId ||
          item._id ||
          item.id
        ) === String(productId);

      });


    if (existingIndex >= 0) {

      const newQuantity =
        Number(
          cart[existingIndex].quantity || 1
        ) + quantity;


      cart[existingIndex].quantity =
        Math.min(
          newQuantity,
          stock
        );


    } else {

      cart.push({

        productId:
          productId,

        _id:
          productId,

        id:
          productId,

        name:
          currentProduct.name ||
          currentProduct.title ||
          "Product",

        title:
          currentProduct.name ||
          currentProduct.title ||
          "Product",

        price:
          getPrice(currentProduct),

        image:
          getImage(currentProduct),

        category:
          currentProduct.category?.name ||
          currentProduct.categoryName ||
          currentProduct.category ||
          "",

        quantity:
          quantity

      });

    }


    saveCart(cart);


    showToast(
      "✓ Product added to cart"
    );


    return true;

  }


  /* =====================================
     BUY NOW
  ===================================== */

  function buyNow(quantity = 1) {

    const added =
      addToCart(quantity);


    if (!added) {
      return;
    }


    /*
      Checkout will read shoplyCart.
      We don't fake payment or order success here.
    */

    window.location.href =
      "checkout.html";

  }


  /* =====================================
     CART COUNT
  ===================================== */

  function updateCartCount() {

    const element =
      document.getElementById(
        "cartCount"
      );


    if (!element) {
      return;
    }


    const cart =
      getCart();


    const count =
      cart.reduce(
        (total, item) => {

          return (
            total +
            Number(
              item.quantity || 1
            )
          );

        },
        0
      );


    element.textContent =
      count;

  }


  /* =====================================
     TOAST
  ===================================== */

  function showToast(message) {

    if (
      typeof window.shoplyToast ===
      "function"
    ) {

      window.shoplyToast(
        message
      );

      return;

    }


    const toast =
      document.getElementById(
        "shoplyToast"
      );


    if (!toast) {
      return;
    }


    toast.textContent =
      message;


    toast.classList.add(
      "show"
    );


    clearTimeout(
      window.shoplyToastTimer
    );


    window.shoplyToastTimer =
      setTimeout(() => {

        toast.classList.remove(
          "show"
        );

      }, 2500);

  }


  /* =====================================
     LISTEN FOR CART CHANGES
  ===================================== */

  window.addEventListener(
    "storage",
    event => {

      if (
        event.key ===
        "shoplyCart"
      ) {

        updateCartCount();

      }

    }
  );


  /* =====================================
     PUBLIC API
  ===================================== */

  window.ShoplyProduct = {

    getProduct() {

      return currentProduct;

    },


    getProductId() {

      return getProductId();

    },


    addToCart(quantity) {

      return addToCart(
        quantity
      );

    },


    buyNow(quantity) {

      return buyNow(
        quantity
      );

    },


    reload() {

      loadProduct();

    }

  };


  /* =====================================
     START
  ===================================== */

  updateCartCount();

  loadProduct();


})();