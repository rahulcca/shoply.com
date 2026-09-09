/* =========================================================
   SHOPLY ADMIN ENGINE
   File: public/js/admin.js
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     API BASE
     ========================================================= */

  const API = "/api";


  /* =========================================================
     TOKEN
     ========================================================= */

  function token() {
    return localStorage.getItem("shoplyToken") || "";
  }


  /* =========================================================
     HEADERS
     ========================================================= */

  function headers(json = true) {
    const h = {};

    if (json) {
      h["Content-Type"] = "application/json";
    }

    const t = token();

    if (t) {
      h["Authorization"] = "Bearer " + t;
    }

    return h;
  }


  /* =========================================================
     HTML ESCAPE
     ========================================================= */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /* =========================================================
     MONEY
     ========================================================= */

  function money(value) {
    return "₹" +
      Number(value || 0).toLocaleString("en-IN");
  }


  /* =========================================================
     MAIN API REQUEST
     ========================================================= */

  async function request(url, options = {}) {

    const response = await fetch(API + url, {
      ...options,

      headers: {
        ...headers(options.body !== undefined),
        ...(options.headers || {})
      }
    });


    let data = null;

    try {
      data = await response.json();
    } catch {
      data = {};
    }


    if (!response.ok) {

      throw new Error(
        data.message ||
        data.error ||
        "Something went wrong"
      );
    }


    return data;
  }


  /* =========================================================
     IMAGE UPLOAD
     Gallery / File Picker Support
     ========================================================= */

  async function uploadProductImage(file) {

    if (!file) {
      throw new Error("Please select an image.");
    }


    if (!(file instanceof File)) {
      throw new Error("Invalid image file.");
    }


    /* Allowed image types */

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif"
    ];


    if (
      file.type &&
      !allowedTypes.includes(file.type)
    ) {
      throw new Error(
        "Only JPG, JPEG, PNG, WEBP or GIF images are allowed."
      );
    }


    /* Maximum 10 MB */

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(
        "Image size must be less than 10 MB."
      );
    }


    const formData = new FormData();

    formData.append(
      "image",
      file
    );


    const response = await fetch(
      API + "/upload/product-image",
      {
        method: "POST",

        headers: {
          Authorization:
            "Bearer " + token()
        },

        body: formData
      }
    );


    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }


    if (!response.ok) {

      throw new Error(
        data.message ||
        data.error ||
        "Image upload failed."
      );
    }


    const image =
      data.image ||
      data.imageUrl ||
      data.url ||
      "";


    if (!image) {
      throw new Error(
        "Server did not return image URL."
      );
    }


    toast(
      "Image uploaded successfully"
    );


    return {
      ...data,
      image,
      imageUrl: image
    };
  }


  /* =========================================================
     DELETE PRODUCT IMAGE
     ========================================================= */

  async function deleteProductImage(image) {

    if (!image) {
      return null;
    }


    const data = await request(
      "/upload/product-image",
      {
        method: "DELETE",

        body: JSON.stringify({
          image: image
        })
      }
    );


    return data;
  }


  /* =========================================================
     AUTH
     ========================================================= */

  function isLoggedIn() {
    return Boolean(token());
  }


  function logout() {

    localStorage.removeItem(
      "shoplyToken"
    );

    localStorage.removeItem(
      "shoplyUser"
    );

    sessionStorage.removeItem(
      "shoplyUser"
    );


    window.location.href =
      "../login.html";
  }


  function requireAdmin() {

    if (!isLoggedIn()) {

      window.location.href =
        "../login.html?redirect=admin";

      return false;
    }


    return true;
  }


  /* =========================================================
     TOAST
     ========================================================= */

  function toast(
    message,
    type = "success"
  ) {

    let box =
      document.getElementById(
        "shoplyAdminToast"
      );


    if (!box) {

      box =
        document.createElement(
          "div"
        );


      box.id =
        "shoplyAdminToast";


      box.style.cssText = `
        position:fixed;
        right:25px;
        bottom:25px;
        z-index:99999;
        padding:14px 20px;
        border-radius:14px;
        color:#fff;
        background:rgba(15,15,25,.96);
        border:1px solid rgba(255,255,255,.12);
        box-shadow:0 15px 45px rgba(0,0,0,.35);
        backdrop-filter:blur(16px);
        transform:translateY(20px);
        opacity:0;
        transition:.3s ease;
        font-weight:600;
        max-width:90vw;
      `;


      document.body.appendChild(
        box
      );
    }


    box.textContent =
      message;


    if (type === "error") {

      box.style.borderColor =
        "rgba(255,70,100,.45)";

    } else {

      box.style.borderColor =
        "rgba(0,220,180,.35)";
    }


    requestAnimationFrame(() => {

      box.style.opacity = "1";

      box.style.transform =
        "translateY(0)";
    });


    clearTimeout(
      window.shoplyAdminToastTimer
    );


    window.shoplyAdminToastTimer =
      setTimeout(() => {

        box.style.opacity = "0";

        box.style.transform =
          "translateY(20px)";

      }, 2500);
  }


  /* =========================================================
     PRODUCTS
     ========================================================= */

  async function getProducts() {

    const data =
      await request(
        "/products"
      );


    if (Array.isArray(data)) {
      return data;
    }


    return (
      data.products ||
      data.data ||
      []
    );
  }


  async function getProduct(id) {

    const products =
      await getProducts();


    return products.find(
      product =>
        String(
          product._id ||
          product.id
        ) === String(id)
    );
  }


  async function createProduct(
    product
  ) {

    const data =
      await request(
        "/products",
        {
          method: "POST",
          body: JSON.stringify(product)
        }
      );


    toast(
      "Product added successfully"
    );


    return data;
  }


  async function updateProduct(
    id,
    product
  ) {

    const data =
      await request(
        "/products/" +
        encodeURIComponent(id),
        {
          method: "PUT",
          body: JSON.stringify(product)
        }
      );


    toast(
      "Product updated successfully"
    );


    return data;
  }


  async function deleteProduct(id) {

    const ok =
      confirm(
        "Are you sure you want to delete this product?"
      );


    if (!ok) {
      return;
    }


    const data =
      await request(
        "/products/" +
        encodeURIComponent(id),
        {
          method: "DELETE"
        }
      );


    toast(
      "Product deleted"
    );


    return data;
  }


  /* =========================================================
     CATEGORIES
     ========================================================= */

  async function getCategories() {

    const data =
      await request(
        "/categories"
      );


    if (Array.isArray(data)) {
      return data;
    }


    return (
      data.categories ||
      data.data ||
      []
    );
  }


  async function createCategory(
    category
  ) {

    const data =
      await request(
        "/categories",
        {
          method: "POST",
          body: JSON.stringify(category)
        }
      );


    toast(
      "Category added"
    );


    return data;
  }


  async function updateCategory(
    id,
    category
  ) {

    const data =
      await request(
        "/categories/" +
        encodeURIComponent(id),
        {
          method: "PUT",
          body: JSON.stringify(category)
        }
      );


    toast(
      "Category updated"
    );


    return data;
  }


  async function deleteCategory(id) {

    const ok =
      confirm(
        "Delete this category?"
      );


    if (!ok) {
      return;
    }


    const data =
      await request(
        "/categories/" +
        encodeURIComponent(id),
        {
          method: "DELETE"
        }
      );


    toast(
      "Category deleted"
    );


    return data;
  }


  /* =========================================================
     ORDERS
     ========================================================= */

  async function getOrders() {

    const data =
      await request(
        "/orders"
      );


    if (Array.isArray(data)) {
      return data;
    }


    return (
      data.orders ||
      data.data ||
      []
    );
  }


  async function getOrder(id) {

    const orders =
      await getOrders();


    return orders.find(
      order =>
        String(
          order._id ||
          order.id ||
          order.orderId
        ) === String(id)
    );
  }


  async function updateOrderStatus(
    id,
    status
  ) {

    const data =
      await request(
        "/orders/" +
        encodeURIComponent(id) +
        "/status",
        {
          method: "PUT",

          body: JSON.stringify({
            status: status
          })
        }
      );


    toast(
      "Order status updated"
    );


    return data;
  }


  /* =========================================================
     COUPONS
     ========================================================= */

  async function getCoupons() {

    const data =
      await request(
        "/coupons"
      );


    if (Array.isArray(data)) {
      return data;
    }


    return (
      data.coupons ||
      data.data ||
      []
    );
  }


  async function createCoupon(
    coupon
  ) {

    const data =
      await request(
        "/coupons",
        {
          method: "POST",
          body: JSON.stringify(coupon)
        }
      );


    toast(
      "Coupon created"
    );


    return data;
  }


  async function updateCoupon(
    id,
    coupon
  ) {

    const data =
      await request(
        "/coupons/" +
        encodeURIComponent(id),
        {
          method: "PUT",
          body: JSON.stringify(coupon)
        }
      );


    toast(
      "Coupon updated"
    );


    return data;
  }


  async function deleteCoupon(id) {

    const ok =
      confirm(
        "Delete this coupon?"
      );


    if (!ok) {
      return;
    }


    const data =
      await request(
        "/coupons/" +
        encodeURIComponent(id),
        {
          method: "DELETE"
        }
      );


    toast(
      "Coupon deleted"
    );


    return data;
  }


  /* =========================================================
     DASHBOARD STATS
     ========================================================= */

  async function loadDashboardStats() {

    const result = {
      products: 0,
      categories: 0,
      orders: 0,
      customers: 0,
      revenue: 0
    };


    try {

      const products =
        await getProducts();


      result.products =
        products.length;

    } catch (error) {

      console.warn(
        "Products stats:",
        error.message
      );
    }


    try {

      const categories =
        await getCategories();


      result.categories =
        categories.length;

    } catch (error) {

      console.warn(
        "Categories stats:",
        error.message
      );
    }


    try {

      const orders =
        await getOrders();


      result.orders =
        orders.length;


      result.revenue =
        orders.reduce(
          (
            sum,
            order
          ) => {

            return sum +
              Number(
                order.total ||
                order.totalAmount ||
                order.amount ||
                0
              );

          },
          0
        );

    } catch (error) {

      console.warn(
        "Orders stats:",
        error.message
      );
    }


    const stats = {

      products: [
        "#productCount",
        "[data-stat-products]"
      ],

      categories: [
        "#categoryCount",
        "[data-stat-categories]"
      ],

      orders: [
        "#orderCount",
        "[data-stat-orders]"
      ],

      customers: [
        "#customerCount",
        "[data-stat-customers]"
      ],

      revenue: [
        "#revenue",
        "[data-stat-revenue]"
      ]
    };


    Object.keys(
      stats
    ).forEach(key => {

      document
        .querySelectorAll(
          stats[key].join(",")
        )
        .forEach(element => {

          element.textContent =
            key === "revenue"
              ? money(result[key])
              : result[key];
        });
    });


    return result;
  }


  /* =========================================================
     RENDER PRODUCT TABLE
     ========================================================= */

  function renderProducts(
    products,
    container
  ) {

    if (!container) {
      return;
    }


    if (!products.length) {

      container.innerHTML = `
        <div class="admin-empty">
          No products found.
        </div>
      `;

      return;
    }


    container.innerHTML =
      products
        .map(product => {

          const id =
            product._id ||
            product.id;


          const name =
            product.name ||
            product.title ||
            "Product";


          const image =
            product.image ||
            product.imageUrl ||
            (
              Array.isArray(
                product.images
              )
                ? product.images[0]
                : ""
            ) ||
            "";


          return `
            <div class="admin-product-row">

              <div class="admin-product-info">

                <img
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(name)}"
                  style="
                    width:55px;
                    height:55px;
                    object-fit:cover;
                    border-radius:12px;
                  "
                >

                <div>

                  <strong>
                    ${escapeHTML(name)}
                  </strong>

                  <small>
                    ${money(product.price)}
                  </small>

                </div>

              </div>


              <div class="admin-product-actions">

                <button
                  type="button"
                  onclick="ShoplyAdmin.editProduct('${escapeHTML(id)}')"
                >
                  Edit
                </button>


                <button
                  type="button"
                  onclick="ShoplyAdmin.deleteProduct('${escapeHTML(id)}')"
                >
                  Delete
                </button>

              </div>

            </div>
          `;

        })
        .join("");
  }


  /* =========================================================
     EDIT PRODUCT
     ========================================================= */

  async function editProduct(id) {

    try {

      const product =
        await getProduct(id);


      if (!product) {

        toast(
          "Product not found",
          "error"
        );

        return;
      }


      const event =
        new CustomEvent(
          "shoply:edit-product",
          {
            detail: product
          }
        );


      document.dispatchEvent(
        event
      );


      window.ShoplyAdmin.currentProduct =
        product;

    } catch (error) {

      toast(
        error.message,
        "error"
      );
    }
  }


  /* =========================================================
     PRODUCT SEARCH
     ========================================================= */

  function filterProducts(
    products,
    search
  ) {

    const term =
      String(search || "")
        .trim()
        .toLowerCase();


    if (!term) {
      return products;
    }


    return products.filter(
      product => {

        const text = [

          product.name,

          product.title,

          product.category,

          product.description,

          product.sku

        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        return text.includes(
          term
        );
      }
    );
  }


  /* =========================================================
     FORM TO OBJECT
     ========================================================= */

  function formToObject(form) {

    const data = {};


    new FormData(
      form
    ).forEach(
      (value, key) => {

        data[key] =
          typeof value === "string"
            ? value.trim()
            : value;
      }
    );


    return data;
  }


  /* =========================================================
     NUMBER FIELDS
     ========================================================= */

  function numberFields(data) {

    const fields = [

      "price",

      "oldPrice",

      "comparePrice",

      "stock",

      "quantity",

      "discount",

      "minimumOrder"

    ];


    fields.forEach(
      field => {

        if (
          data[field] !== undefined &&
          data[field] !== ""
        ) {

          data[field] =
            Number(
              data[field]
            );
        }
      }
    );


    return data;
  }


  /* =========================================================
     AUTO PRODUCT FORM
     ========================================================= */

  document.addEventListener(
    "submit",
    async function (event) {

      const form =
        event.target;


      if (
        !form.matches(
          "[data-product-form]"
        )
      ) {

        return;
      }


      event.preventDefault();


      try {

        let data =
          formToObject(form);


        data =
          numberFields(data);


        const id =
          form.dataset.productId;


        if (id) {

          await updateProduct(
            id,
            data
          );

        } else {

          await createProduct(
            data
          );
        }


        form.reset();


        document.dispatchEvent(
          new CustomEvent(
            "shoply:product-saved"
          )
        );

      } catch (error) {

        console.error(
          error
        );


        toast(
          error.message,
          "error"
        );
      }
    }
  );


  /* =========================================================
     AUTO LOGOUT
     ========================================================= */

  document.addEventListener(
    "click",
    function (event) {

      const logoutButton =
        event.target.closest(
          "[data-admin-logout]"
        );


      if (
        logoutButton
      ) {

        event.preventDefault();

        logout();
      }
    }
  );


  /* =========================================================
     INITIALIZATION
     ========================================================= */

  async function init() {

    if (
      document.body.dataset.adminAuth !==
      "optional"
    ) {

      if (!requireAdmin()) {
        return;
      }
    }


    try {

      await loadDashboardStats();

    } catch (error) {

      console.warn(
        "Dashboard initialization:",
        error.message
      );
    }


    window.ShoplyAdmin.initialized =
      true;
  }


  /* =========================================================
     GLOBAL SHOPLY ADMIN API
     ========================================================= */

  window.ShoplyAdmin = {

    /* API */

    API,

    request,

    token,

    headers,


    /* Auth */

    isLoggedIn,

    requireAdmin,

    logout,


    /* Toast */

    toast,


    /* Product */

    getProducts,

    getProduct,

    createProduct,

    updateProduct,

    deleteProduct,

    editProduct,


    /* ⭐ NEW IMAGE UPLOAD */

    uploadProductImage,

    deleteProductImage,


    /* Categories */

    getCategories,

    createCategory,

    updateCategory,

    deleteCategory,


    /* Orders */

    getOrders,

    getOrder,

    updateOrderStatus,


    /* Coupons */

    getCoupons,

    createCoupon,

    updateCoupon,

    deleteCoupon,


    /* Dashboard */

    loadDashboardStats,


    /* Rendering */

    renderProducts,

    filterProducts,


    /* Forms */

    formToObject,

    numberFields,


    /* State */

    currentProduct: null,

    initialized: false
  };


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();
  }


})();