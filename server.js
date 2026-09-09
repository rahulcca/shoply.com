const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "shoply_secret_2026";

const PUBLIC_DIR = path.join(__dirname, "public");
const ADMIN_DIR = path.join(PUBLIC_DIR, "admin");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "shoply.json");

const PRODUCT_IMAGE_DIR = path.join(
  PUBLIC_DIR,
  "images",
  "products"
);

// ==================================================
// BASIC SETUP
// ==================================================

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

// ==================================================
// PRODUCT IMAGE UPLOAD
// ==================================================

if (!fs.existsSync(PRODUCT_IMAGE_DIR)) {
  fs.mkdirSync(PRODUCT_IMAGE_DIR, {
    recursive: true
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PRODUCT_IMAGE_DIR);
  },

  filename: function (req, file, cb) {
    const extension =
      path.extname(file.originalname).toLowerCase();

    const safeName =
      path
        .basename(
          file.originalname,
          extension
        )
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .substring(0, 50);

    const unique =
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 8);

    cb(
      null,
      `${safeName || "product"}-${unique}${extension}`
    );
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    if (
      allowedTypes.includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, JPEG, PNG, WEBP and GIF images are allowed."
        )
      );
    }
  }
});

// ==================================================
// FILE DATABASE
// ==================================================

function createDefaultData() {
  return {
    users: [],
    products: [],
    categories: [],
    coupons: [],
    orders: []
  };
}

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true
    });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        createDefaultData(),
        null,
        2
      ),
      "utf8"
    );
  }
}

function readDatabase() {
  ensureDatabase();

  try {
    const data = JSON.parse(
      fs.readFileSync(
        DATA_FILE,
        "utf8"
      )
    );

    return {
      ...createDefaultData(),
      ...data
    };
  } catch (error) {
    console.log(
      "Database read error:",
      error.message
    );

    return createDefaultData();
  }
}

function saveDatabase(data) {
  ensureDatabase();

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );
}

function generateId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .substring(2, 8)
  );
}

// ==================================================
// JWT
// ==================================================

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );
}

// ==================================================
// ADMIN LOGIN SETTINGS
// ==================================================
// 👇 केवल इन 2 lines में अपनी Admin ID और Password बदलें

const ADMIN_EMAIL = "admin@shoply.com";
const ADMIN_PASSWORD = "Shoply@2026!";

// ==================================================
// DEFAULT / CUSTOM ADMIN
// ==================================================

async function ensureAdminUser() {
  const data = readDatabase();

  const cleanAdminEmail = String(ADMIN_EMAIL)
    .trim()
    .toLowerCase();

  const adminPassword = String(ADMIN_PASSWORD);

  // Existing admin को ढूंढें
  let admin = data.users.find(
    user => user.role === "admin"
  );

  // Admin नहीं है तो नया admin बनाएं
  if (!admin) {
    const hashedPassword = await bcrypt.hash(
      adminPassword,
      10
    );

    admin = {
      id: generateId(),
      name: "Shoply Admin",
      email: cleanAdminEmail,
      password: hashedPassword,
      phone: "",
      role: "admin",
      createdAt: new Date().toISOString()
    };

    data.users.push(admin);
    saveDatabase(data);

    console.log("Admin account created.");
    return;
  }

  let changed = false;

  // Admin role सही रखें
  if (admin.role !== "admin") {
    admin.role = "admin";
    changed = true;
  }

  // Admin ID/email बदलने पर update करें
  if (
    String(admin.email || "")
      .trim()
      .toLowerCase() !== cleanAdminEmail
  ) {
    admin.email = cleanAdminEmail;
    changed = true;
  }

  // Password check करें
  const passwordValid = await bcrypt
    .compare(
      adminPassword,
      admin.password || ""
    )
    .catch(() => false);

  // Password गलत/बदला हुआ है तो नया password save करें
  if (!passwordValid) {
    admin.password = await bcrypt.hash(
      adminPassword,
      10
    );

    changed = true;
  }

  if (changed) {
    saveDatabase(data);
    console.log("Admin account updated.");
  }
}

// ==================================================
// CUSTOMER AUTH
// ==================================================

function auth(
  req,
  res,
  next
) {
  const authorization =
    req.headers.authorization ||
    "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return res.status(401).json({
      success: false,
      message: "Login required"
    });
  }

  const token =
    authorization.substring(7);

  try {
    req.user =
      jwt.verify(
        token,
        JWT_SECRET
      );

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired login"
    });
  }
}

// ==================================================
// ADMIN AUTH
// ==================================================

function adminAuth(
  req,
  res,
  next
) {
  auth(
    req,
    res,
    () => {
      if (
        req.user.role !==
        "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access required"
        });
      }

      next();
    }
  );
}

// ==================================================
// HEALTH
// ==================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Shoply server is running",
      database:
        "File based",
      mongodb: false
    });
  }
);

// ==================================================
// CUSTOMER REGISTER
// ==================================================

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        phone
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required"
        });
      }

      const data =
        readDatabase();

      const cleanEmail =
        String(email)
          .trim()
          .toLowerCase();

      const existingUser =
        data.users.find(
          user =>
            user.email ===
            cleanEmail
        );

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "Email already registered"
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user = {
        id: generateId(),
        name:
          String(name).trim(),
        email: cleanEmail,
        password:
          hashedPassword,
        phone: phone || "",
        role: "customer",
        createdAt:
          new Date().toISOString()
      };

      data.users.push(user);

      saveDatabase(data);

      const token =
        createToken(user);

      res.status(201).json({
        success: true,
        message:
          "Registration successful",
        token,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Registration failed"
      });
    }
  }
);

// ==================================================
// CUSTOMER LOGIN
// ==================================================

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        email,
        password
      } = req.body;

      const data =
        readDatabase();

      const cleanEmail =
        String(email || "")
          .trim()
          .toLowerCase();

      const user =
        data.users.find(
          item =>
            item.email ===
            cleanEmail
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password"
        });
      }

      const validPassword =
        await bcrypt.compare(
          password || "",
          user.password
        );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password"
        });
      }

      const token =
        createToken(user);

      res.json({
        success: true,
        token,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Login failed"
      });
    }
  }
);

// ==================================================
// ADMIN LOGIN
// ==================================================

app.post(
  "/api/admin/login",
  async (req, res) => {
    try {
      const {
        email,
        password
      } = req.body;

      const cleanEmail =
        String(email || "")
          .trim()
          .toLowerCase();

      const data =
        readDatabase();

      const user =
        data.users.find(
          item =>
            item.email ===
              cleanEmail &&
            item.role === "admin"
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid admin ID or password"
        });
      }

      const validPassword =
        await bcrypt.compare(
          password || "",
          user.password
        );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid admin ID or password"
        });
      }

      const token =
        createToken(user);

      res.json({
        success: true,
        message:
          "Admin login successful",
        token,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error(
        "ADMIN LOGIN ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Admin login failed"
      });
    }
  }
);

// ==================================================
// CURRENT USER
// ==================================================

app.get(
  "/api/auth/me",
  auth,
  (req, res) => {
    const data =
      readDatabase();

    const user =
      data.users.find(
        item =>
          item.id ===
          req.user.id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found"
      });
    }

    res.json({
      success: true,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  }
);

// ==================================================
// PRODUCTS - PUBLIC
// ==================================================

app.get(
  "/api/products",
  (req, res) => {
    const data =
      readDatabase();

    let products =
      data.products;

    if (req.query.category) {
      products =
        products.filter(
          product =>
            String(
              product.category
            ).toLowerCase() ===
            String(
              req.query.category
            ).toLowerCase()
        );
    }

    if (req.query.search) {
      const search =
        String(
          req.query.search
        ).toLowerCase();

      products =
        products.filter(
          product =>
            `${product.name || ""} ${
              product.title || ""
            } ${
              product.description || ""
            }`
              .toLowerCase()
              .includes(search)
        );
    }

    res.json({
      success: true,
      products
    });
  }
);

// ==================================================
// PRODUCT IMAGE UPLOAD API
// ==================================================

app.post(
  "/api/upload/product-image",
  adminAuth,
  upload.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Please select an image."
        });
      }

      const imageUrl =
        "/images/products/" +
        req.file.filename;

      res.status(201).json({
        success: true,
        message:
          "Product image uploaded successfully",
        image: imageUrl,
        imageUrl: imageUrl,
        filename:
          req.file.filename
      });
    } catch (error) {
      console.error(
        "IMAGE UPLOAD ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Image upload failed"
      });
    }
  }
);

// ==================================================
// PRODUCT IMAGE DELETE API
// ==================================================

app.delete(
  "/api/upload/product-image",
  adminAuth,
  (req, res) => {
    try {
      const image =
        req.body.image ||
        "";

      if (
        !image.startsWith(
          "/images/products/"
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product image"
        });
      }

      const filename =
        path.basename(image);

      const imagePath =
        path.join(
          PRODUCT_IMAGE_DIR,
          filename
        );

      if (
        fs.existsSync(imagePath)
      ) {
        fs.unlinkSync(
          imagePath
        );
      }

      res.json({
        success: true,
        message:
          "Image deleted"
      });
    } catch (error) {
      console.error(
        "IMAGE DELETE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Image delete failed"
      });
    }
  }
);

// ==================================================
// PRODUCTS - ADMIN
// ==================================================

app.post(
  "/api/products",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const product = {
      id: generateId(),
      ...req.body,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };

    data.products.push(
      product
    );

    saveDatabase(data);

    res.status(201).json({
      success: true,
      message:
        "Product created",
      product
    });
  }
);

app.put(
  "/api/products/:id",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const index =
      data.products.findIndex(
        product =>
          product.id ===
          req.params.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found"
      });
    }

    data.products[index] = {
      ...data.products[index],
      ...req.body,

      id:
        data.products[index].id,

      updatedAt:
        new Date().toISOString()
    };

    saveDatabase(data);

    res.json({
      success: true,
      message:
        "Product updated",
      product:
        data.products[index]
    });
  }
);

app.delete(
  "/api/products/:id",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const product =
      data.products.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found"
      });
    }

    data.products =
      data.products.filter(
        item =>
          item.id !==
          req.params.id
      );

    saveDatabase(data);

    res.json({
      success: true,
      message:
        "Product deleted"
    });
  }
);

// ==================================================
// CATEGORIES
// ==================================================

app.get(
  "/api/categories",
  (req, res) => {
    const data =
      readDatabase();

    res.json({
      success: true,
      categories:
        data.categories
    });
  }
);

app.post(
  "/api/categories",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const name =
      req.body.name ||
      "New Category";

    const category = {
      id: generateId(),

      name,

      slug:
        req.body.slug ||
        String(name)
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          ),

      description:
        req.body.description ||
        "",

      image:
        req.body.image ||
        "",

      createdAt:
        new Date().toISOString()
    };

    data.categories.push(
      category
    );

    saveDatabase(data);

    res.status(201).json({
      success: true,
      category
    });
  }
);

app.put(
  "/api/categories/:id",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const index =
      data.categories.findIndex(
        category =>
          category.id ===
          req.params.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message:
          "Category not found"
      });
    }

    data.categories[index] = {
      ...data.categories[index],
      ...req.body,

      id:
        data.categories[index]
          .id
    };

    saveDatabase(data);

    res.json({
      success: true,
      category:
        data.categories[index]
    });
  }
);

app.delete(
  "/api/categories/:id",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    data.categories =
      data.categories.filter(
        category =>
          category.id !==
          req.params.id
      );

    saveDatabase(data);

    res.json({
      success: true,
      message:
        "Category deleted"
    });
  }
);

// ==================================================
// COUPONS
// ==================================================

app.get(
  "/api/coupons",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    res.json({
      success: true,
      coupons:
        data.coupons
    });
  }
);

app.post(
  "/api/coupons",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const coupon = {
      id: generateId(),

      ...req.body,

      code:
        String(
          req.body.code || ""
        ).toUpperCase(),

      createdAt:
        new Date().toISOString()
    };

    data.coupons.push(
      coupon
    );

    saveDatabase(data);

    res.status(201).json({
      success: true,
      coupon
    });
  }
);

app.put(
  "/api/coupons/:id",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const index =
      data.coupons.findIndex(
        coupon =>
          coupon.id ===
          req.params.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message:
          "Coupon not found"
      });
    }

    data.coupons[index] = {
      ...data.coupons[index],
      ...req.body,

      id:
        data.coupons[index].id
    };

    saveDatabase(data);

    res.json({
      success: true,
      coupon:
        data.coupons[index]
    });
  }
);

app.delete(
  "/api/coupons/:id",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    data.coupons =
      data.coupons.filter(
        coupon =>
          coupon.id !==
          req.params.id
      );

    saveDatabase(data);

    res.json({
      success: true,
      message:
        "Coupon deleted"
    });
  }
);

// ==================================================
// COUPON VALIDATION
// ==================================================

app.post(
  "/api/coupons/validate",
  (req, res) => {
    const data =
      readDatabase();

    const code =
      String(
        req.body.code || ""
      )
        .trim()
        .toUpperCase();

    const coupon =
      data.coupons.find(
        item =>
          String(
            item.code
          ).toUpperCase() ===
          code
      );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message:
          "Invalid coupon"
      });
    }

    if (
      coupon.active ===
      false
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Coupon is inactive"
      });
    }

    if (
      coupon.expiry &&
      new Date(
        coupon.expiry
      ) < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Coupon expired"
      });
    }

    res.json({
      success: true,
      coupon
    });
  }
);

// ==================================================
// ORDERS
// ==================================================

app.post(
  "/api/orders",
  auth,
  (req, res) => {
    const data =
      readDatabase();

    const order = {
      id:
        "ORD-" +
        Date.now(),

      userId:
        req.user.id,

      ...req.body,

      status:
        "pending",

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };

    data.orders.push(
      order
    );

    saveDatabase(data);

    res.status(201).json({
      success: true,
      message:
        "Order created",
      order
    });
  }
);

app.get(
  "/api/orders",
  auth,
  (req, res) => {
    const data =
      readDatabase();

    const orders =
      req.user.role ===
      "admin"
        ? data.orders
        : data.orders.filter(
            order =>
              order.userId ===
              req.user.id
          );

    res.json({
      success: true,
      orders
    });
  }
);

app.get(
  "/api/orders/:id",
  auth,
  (req, res) => {
    const data =
      readDatabase();

    const order =
      data.orders.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found"
      });
    }

    if (
      req.user.role !==
        "admin" &&
      order.userId !==
        req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied"
      });
    }

    res.json({
      success: true,
      order
    });
  }
);

app.put(
  "/api/orders/:id/status",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const order =
      data.orders.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found"
      });
    }

    order.status =
      req.body.status ||
      order.status;

    order.updatedAt =
      new Date().toISOString();

    saveDatabase(data);

    res.json({
      success: true,
      order
    });
  }
);

// ==================================================
// CUSTOMERS - ADMIN
// ==================================================

app.get(
  "/api/customers",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const customers =
      data.users
        .filter(
          user =>
            user.role !==
            "admin"
        )
        .map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          createdAt:
            user.createdAt
        }));

    res.json({
      success: true,
      customers
    });
  }
);

// ==================================================
// ADMIN STATS
// ==================================================

app.get(
  "/api/admin/stats",
  adminAuth,
  (req, res) => {
    const data =
      readDatabase();

    const revenue =
      data.orders.reduce(
        (sum, order) =>
          sum +
          Number(
            order.total ||
              order.amount ||
              0
          ),
        0
      );

    res.json({
      success: true,

      stats: {
        products:
          data.products.length,

        categories:
          data.categories.length,

        orders:
          data.orders.length,

        customers:
          data.users.filter(
            user =>
              user.role !==
              "admin"
          ).length,

        revenue
      }
    });
  }
);

// ==================================================
// PAYMENT - AMAZON MODE
// ==================================================

app.post(
  "/api/payment/create",
  auth,
  (req, res) => {
    res.json({
      success: false,
      message:
        "Payment is handled on Amazon."
    });
  }
);

app.post(
  "/api/payment/create-cod",
  auth,
  (req, res) => {
    res.json({
      success: false,
      message:
        "COD is not enabled."
    });
  }
);

// ==================================================
// ADMIN URL
// ==================================================

app.get(
  "/admin",
  (req, res) => {
    res.sendFile(
      path.join(
        ADMIN_DIR,
        "login.html"
      )
    );
  }
);

app.get(
  "/admin/",
  (req, res) => {
    res.sendFile(
      path.join(
        ADMIN_DIR,
        "login.html"
      )
    );
  }
);

// ==================================================
// STATIC WEBSITE
// ==================================================

app.use(
  express.static(
    PUBLIC_DIR
  )
);

// ==================================================
// ADMIN HTML PAGES
// ==================================================

app.get(
  "/admin/:page",
  (req, res, next) => {
    const page =
      req.params.page;

    const allowedPages = [
      "login.html",
      "index.html",
      "admin.html",
      "categories.html",
      "coupons.html",
      "customer.html",
      "order.html",
      "product.html",
      "setting.html"
    ];

    if (
      !allowedPages.includes(
        page
      )
    ) {
      return next();
    }

    res.sendFile(
      path.join(
        ADMIN_DIR,
        page
      )
    );
  }
);

// ==================================================
// API 404
// ==================================================

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API route not found"
    });
  }
);

// ==================================================
// WEBSITE FALLBACK
// ==================================================

app.use(
  (req, res, next) => {
    if (
      req.method === "GET" &&
      !req.path.startsWith(
        "/api/"
      ) &&
      !req.path.startsWith(
        "/admin"
      )
    ) {
      return res.sendFile(
        path.join(
          PUBLIC_DIR,
          "index.html"
        )
      );
    }

    next();
  }
);

// ==================================================
// ERROR HANDLER
// ==================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.code ===
          "LIMIT_FILE_SIZE"
            ? "Image is too large. Maximum size is 5MB."
            : error.message
      });
    }

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error"
    });
  }
);

// ==================================================
// START SERVER
// ==================================================

ensureDatabase();

(async () => {
  await ensureAdminUser();

  app.listen(
    PORT,
    () => {
      console.log("");

      console.log(
        "===================================="
      );

      console.log(
        "       SHOPLY SERVER RUNNING"
      );

      console.log(
        "===================================="
      );

      console.log(
        `Website: http://localhost:${PORT}`
      );

      console.log(
        `Admin:   http://localhost:${PORT}/admin/`
      );

      console.log(
        `Data:    ${DATA_FILE}`
      );

      console.log(
        `Images:  ${PRODUCT_IMAGE_DIR}`
      );

      console.log(
        "Database: File Based"
      );

      console.log(
        "MongoDB: Not Required"
      );

      console.log(
        `Admin ID: ${ADMIN_EMAIL}`
      );

      console.log(
        "Admin Password: [HIDDEN]"
      );

      console.log(
        "===================================="
      );

      console.log("");
    }
  );
})();