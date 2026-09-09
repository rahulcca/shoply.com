/* =========================================================
   SHOPLY - CHECKOUT SYSTEM
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("checkoutForm");
  const orderItemsBox = document.getElementById("orderItems");

  const subtotalEl = document.getElementById("subtotal");
  const deliveryEl = document.getElementById("deliveryCharge");
  const discountEl = document.getElementById("discount");
  const totalEl = document.getElementById("totalAmount");

  const couponInput = document.getElementById("coupon");
  const applyCouponBtn = document.getElementById("applyCoupon");

  const messageBox = document.getElementById("checkoutMessage");
  const placeOrderBtn = document.getElementById("placeOrderBtn");

  const onlinePayment = document.getElementById("onlinePayment");
  const codPayment = document.getElementById("codPayment");

  let cart = [];
  let couponDiscount = 0;
  let appliedCoupon = null;

  /* =========================================================
     HELPERS
     ========================================================= */

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("shoplyCart")) || [];
    } catch (error) {
      console.error("Cart read error:", error);
      return [];
    }
  }

  function saveCart(data) {
    localStorage.setItem("shoplyCart", JSON.stringify(data));
  }

  function money(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showMessage(text, type = "error") {
    if (!messageBox) return;

    messageBox.textContent = text;
    messageBox.className = "checkout-message show " + type;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function hideMessage() {
    if (!messageBox) return;

    messageBox.textContent = "";
    messageBox.className = "checkout-message";
  }

  /* =========================================================
     LOAD CART
     ========================================================= */

  function loadCart() {
    cart = getCart();

    if (!Array.isArray(cart)) {
      cart = [];
    }

    renderCart();
    updateSummary();
  }

  /* =========================================================
     RENDER CART
     ========================================================= */

  function renderCart() {
    if (!orderItemsBox) return;

    if (cart.length === 0) {
      orderItemsBox.innerHTML = `
        <div class="empty-checkout">
          <div class="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some products before checkout.</p>
          <a href="index.html">Continue Shopping</a>
        </div>
      `;

      if (form) {
        form.style.display = "none";
      }

      return;
    }

    if (form) {
      form.style.display = "block";
    }

    orderItemsBox.innerHTML = cart.map((item) => {

      const quantity = Number(item.quantity || 1);
      const price = Number(
        item.price ||
        item.salePrice ||
        item.productPrice ||
        0
      );

      const image =
        item.image ||
        item.imageUrl ||
        "images/product-placeholder.jpg";

      return `
        <div class="order-item">

          <div class="order-item-image">
            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(item.name || "Product")}"
              onerror="this.style.display='none'"
            >
          </div>

          <div class="order-item-info">
            <h3>
              ${escapeHTML(item.name || "Product")}
            </h3>

            <p>
              Quantity: ${quantity}
            </p>
          </div>

          <div class="order-item-price">
            ${money(price * quantity)}
          </div>

        </div>
      `;

    }).join("");
  }

  /* =========================================================
     CALCULATE SUBTOTAL
     ========================================================= */

  function calculateSubtotal() {
    return cart.reduce((total, item) => {

      const price = Number(
        item.price ||
        item.salePrice ||
        item.productPrice ||
        0
      );

      const quantity = Number(item.quantity || 1);

      return total + (price * quantity);

    }, 0);
  }

  /* =========================================================
     PAYMENT / SUMMARY
     ========================================================= */

  function updateSummary() {

    const subtotal = calculateSubtotal();

    /*
      Normal delivery:
      Free delivery above ₹999
      ₹49 below ₹999
    */

    let deliveryCharge = subtotal >= 999 ? 0 : 49;

    /*
      COD:
      Extra ₹700 delivery charge
    */

    const isCOD =
      codPayment &&
      codPayment.checked;

    const codCharge = isCOD ? 700 : 0;

    const discount = Math.min(
      couponDiscount,
      subtotal
    );

    const total =
      subtotal +
      deliveryCharge +
      codCharge -
      discount;

    if (subtotalEl) {
      subtotalEl.textContent = money(subtotal);
    }

    if (deliveryEl) {
      deliveryEl.textContent =
        deliveryCharge === 0
          ? "FREE"
          : money(deliveryCharge);
    }

    if (discountEl) {
      discountEl.textContent =
        discount > 0
          ? "-" + money(discount)
          : money(0);
    }

    if (totalEl) {
      totalEl.textContent = money(Math.max(total, 0));
    }
  }

  /* =========================================================
     PAYMENT METHOD CHANGE
     ========================================================= */

  function handlePaymentChange() {

    updateSummary();

    if (codPayment && codPayment.checked) {

      showMessage(
        "COD selected. ₹700 delivery charge must be paid online and verified before the COD order is submitted.",
        "error"
      );

    } else {

      hideMessage();

    }
  }

  if (onlinePayment) {
    onlinePayment.addEventListener(
      "change",
      handlePaymentChange
    );
  }

  if (codPayment) {
    codPayment.addEventListener(
      "change",
      handlePaymentChange
    );
  }

  /* =========================================================
     COUPON
     ========================================================= */

  if (applyCouponBtn) {

    applyCouponBtn.addEventListener("click", async () => {

      const code =
        couponInput?.value
          ?.trim()
          .toUpperCase();

      if (!code) {
        showMessage(
          "Please enter a coupon code.",
          "error"
        );
        return;
      }

      const subtotal = calculateSubtotal();

      applyCouponBtn.disabled = true;
      applyCouponBtn.textContent = "Checking...";

      try {

        const response = await fetch(
          "/api/coupons/validate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              code,
              cartTotal: subtotal
            })
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

          /*
            If backend doesn't have coupon validation yet,
            don't break checkout.
          */

          throw new Error(
            data.message || "Invalid coupon"
          );
        }

        const coupon = data.coupon || data;

        let discount = 0;

        if (
          coupon.discountType === "percentage" ||
          coupon.type === "percentage"
        ) {

          discount =
            subtotal *
            (Number(coupon.discountValue || coupon.value || 0) / 100);

          if (coupon.maxDiscount) {
            discount = Math.min(
              discount,
              Number(coupon.maxDiscount)
            );
          }

        } else {

          discount = Number(
            coupon.discountValue ||
            coupon.value ||
            0
          );

        }

        couponDiscount = Math.min(
          discount,
          subtotal
        );

        appliedCoupon = code;

        updateSummary();

        showMessage(
          `Coupon ${code} applied successfully. You saved ${money(couponDiscount)}.`,
          "success"
        );

        applyCouponBtn.textContent = "Applied";

      } catch (error) {

        console.error("Coupon error:", error);

        couponDiscount = 0;
        appliedCoupon = null;

        updateSummary();

        showMessage(
          error.message || "Coupon could not be applied.",
          "error"
        );

        applyCouponBtn.disabled = false;
        applyCouponBtn.textContent = "Apply";
      }

    });

  }

  /* =========================================================
     FORM DATA
     ========================================================= */

  function getCustomerDetails() {

    return {
      name:
        document.getElementById("name")?.value.trim() || "",

      phone:
        document.getElementById("phone")?.value.trim() || "",

      address:
        document.getElementById("address")?.value.trim() || "",

      city:
        document.getElementById("city")?.value.trim() || "",

      state:
        document.getElementById("state")?.value.trim() || "",

      pincode:
        document.getElementById("pincode")?.value.trim() || "",

      landmark:
        document.getElementById("landmark")?.value.trim() || ""
    };

  }

  /* =========================================================
     VALIDATION
     ========================================================= */

  function validateCustomer(details) {

    if (!details.name) {
      return "Please enter your full name.";
    }

    if (!/^[0-9]{10}$/.test(details.phone)) {
      return "Please enter a valid 10 digit mobile number.";
    }

    if (!details.address) {
      return "Please enter your complete address.";
    }

    if (!details.city) {
      return "Please enter your city.";
    }

    if (!details.state) {
      return "Please enter your state.";
    }

    if (!/^[0-9]{6}$/.test(details.pincode)) {
      return "Please enter a valid 6 digit PIN code.";
    }

    if (cart.length === 0) {
      return "Your cart is empty.";
    }

    return null;
  }

  /* =========================================================
     PREPARE ORDER
     ========================================================= */

  function createOrderPayload(details) {

    const subtotal = calculateSubtotal();

    const deliveryCharge =
      subtotal >= 999 ? 0 : 49;

    const isCOD =
      codPayment &&
      codPayment.checked;

    const codCharge =
      isCOD ? 700 : 0;

    const total =
      subtotal +
      deliveryCharge +
      codCharge -
      couponDiscount;

    return {

      customer: details,

      items: cart.map(item => ({
        product:
          item.product ||
          item.productId ||
          item._id ||
          item.id,

        name: item.name,

        price: Number(
          item.price ||
          item.salePrice ||
          item.productPrice ||
          0
        ),

        quantity: Number(
          item.quantity || 1
        ),

        image:
          item.image ||
          item.imageUrl ||
          ""
      })),

      paymentMethod:
        isCOD ? "COD" : "ONLINE",

      couponCode:
        appliedCoupon || null,

      subtotal,

      deliveryCharge,

      codDeliveryCharge:
        codCharge,

      discount:
        couponDiscount,

      total,

      currency: "INR"
    };
  }

  /* =========================================================
     SERVER ORDER REQUEST
     ========================================================= */

  async function submitOrder(orderData) {

    const response = await fetch(
      "/api/orders",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(orderData)
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Order could not be placed."
      );

    }

    return data;
  }

  /* =========================================================
     ONLINE PAYMENT
     ========================================================= */

  async function startOnlinePayment(orderData) {

    /*
      This requests the backend to create/prepare
      the payment transaction.

      Real payment verification must happen on the
      server before an order is confirmed.
    */

    const response = await fetch(
      "/api/payment/create",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          amount: orderData.total,
          order: orderData
        })
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Payment could not be started."
      );

    }

    /*
      If backend returns a payment URL,
      redirect customer to it.
    */

    if (data.paymentUrl) {

      window.location.href =
        data.paymentUrl;

      return;
    }

    /*
      If backend already verified payment
      and directly created the order.
    */

    if (
      data.success &&
      (data.orderId || data.order)
    ) {

      completeOrder(data);
      return;
    }

    throw new Error(
      "Payment gateway is not configured yet."
    );
  }

  /* =========================================================
     COD PAYMENT VERIFICATION
     ========================================================= */

  async function startCODPayment(orderData) {

    /*
      COD is NOT directly submitted.

      First ₹700 delivery charge has to be paid
      and verified by the server.
    */

    const response = await fetch(
      "/api/payment/create-cod",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          amount: 700,
          order: orderData
        })
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {

      throw new Error(
        data.message ||
        "COD payment could not be started."
      );

    }

    if (data.paymentUrl) {

      window.location.href =
        data.paymentUrl;

      return;
    }

    if (data.checkoutUrl) {

      window.location.href =
        data.checkoutUrl;

      return;
    }

    /*
      Never trust the browser to mark COD payment
      as verified.
    */

    if (
      data.paymentVerified === true &&
      data.orderId
    ) {

      completeOrder(data);
      return;
    }

    throw new Error(
      "COD delivery-charge payment is not configured yet."
    );
  }

  /* =========================================================
     COMPLETE ORDER
     ========================================================= */

  function completeOrder(data) {

    const orderId =
      data.orderId ||
      data.order?._id ||
      data.order?.id ||
      data.order?.orderId;

    /*
      Clear cart only after successful
      server confirmation.
    */

    saveCart([]);

    localStorage.removeItem(
      "shoplyCart"
    );

    if (orderId) {

      window.location.href =
        `orders.html?success=1&order=${encodeURIComponent(orderId)}`;

      return;
    }

    window.location.href =
      "orders.html?success=1";
  }

  /* =========================================================
     PLACE ORDER
     ========================================================= */

  if (form) {

    form.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        hideMessage();

        const details =
          getCustomerDetails();

        const validationError =
          validateCustomer(details);

        if (validationError) {

          showMessage(
            validationError,
            "error"
          );

          return;
        }

        const orderData =
          createOrderPayload(details);

        const isCOD =
          codPayment &&
          codPayment.checked;

        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent =
          isCOD
            ? "Starting Secure Payment..."
            : "Processing...";

        try {

          if (isCOD) {

            /*
              COD:
              ₹700 payment first.
            */

            await startCODPayment(
              orderData
            );

          } else {

            /*
              Online:
              full order amount through
              server-side payment flow.
            */

            await startOnlinePayment(
              orderData
            );

          }

        } catch (error) {

          console.error(
            "Checkout error:",
            error
          );

          showMessage(
            error.message ||
            "Something went wrong while processing your order.",
            "error"
          );

          placeOrderBtn.disabled = false;

          placeOrderBtn.textContent =
            "Place Order";
        }

      }
    );

  }

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  loadCart();

});