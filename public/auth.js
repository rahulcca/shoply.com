/* =========================================================
   SHOPLY - AUTHENTICATION SYSTEM
   Login / Register / JWT Session
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");

  const messageBox = document.getElementById("authMessage");


  /* =========================================================
     HELPERS
     ========================================================= */

  function showMessage(message, type = "error") {

    if (!messageBox) return;

    messageBox.textContent = message;

    messageBox.className =
      "auth-message show " + type;

  }


  function clearMessage() {

    if (!messageBox) return;

    messageBox.textContent = "";

    messageBox.className =
      "auth-message";

  }


  function setLoading(button, loading, loadingText, normalText) {

    if (!button) return;

    button.disabled = loading;

    button.textContent =
      loading ? loadingText : normalText;

  }


  function saveAuth(data, remember = true) {

    /*
      Backend may return:
      {
        token,
        user
      }

      We support common alternatives too.
    */

    const token =
      data.token ||
      data.accessToken ||
      data.jwt;

    const user =
      data.user ||
      data.customer ||
      null;


    if (!token) {
      throw new Error(
        "Login successful but authentication token was not received."
      );
    }


    const storage =
      remember
        ? localStorage
        : sessionStorage;


    storage.setItem(
      "shoplyToken",
      token
    );


    if (user) {

      storage.setItem(
        "shoplyUser",
        JSON.stringify(user)
      );

    }

    /*
      Remove old token from the opposite
      storage to avoid session confusion.
    */

    const otherStorage =
      remember
        ? sessionStorage
        : localStorage;


    otherStorage.removeItem(
      "shoplyToken"
    );

    otherStorage.removeItem(
      "shoplyUser"
    );

  }


  function getToken() {

    return (
      localStorage.getItem("shoplyToken") ||
      sessionStorage.getItem("shoplyToken") ||
      ""
    );

  }


  function getUser() {

    const savedUser =
      localStorage.getItem("shoplyUser") ||
      sessionStorage.getItem("shoplyUser");

    if (!savedUser) return null;

    try {

      return JSON.parse(savedUser);

    } catch {

      return null;

    }

  }


  /* =========================================================
     LOGIN
     ========================================================= */

  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        clearMessage();


        const email =
          document.getElementById(
            "loginEmail"
          )?.value
            .trim()
            .toLowerCase();


        const password =
          document.getElementById(
            "loginPassword"
          )?.value || "";


        const remember =
          document.getElementById(
            "rememberMe"
          )?.checked || false;


        if (!email) {

          showMessage(
            "Please enter your email address.",
            "error"
          );

          return;

        }


        if (!password) {

          showMessage(
            "Please enter your password.",
            "error"
          );

          return;

        }


        setLoading(
          loginBtn,
          true,
          "Signing in...",
          "Login to Shoply"
        );


        try {

          /*
            Main backend login endpoint.
          */

          const response =
            await fetch(
              "/api/auth/login",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                  email,
                  password
                })
              }
            );


          let data = {};

          try {

            data =
              await response.json();

          } catch {

            data = {};

          }


          if (!response.ok) {

            throw new Error(
              data.message ||
              data.error ||
              "Invalid email or password."
            );

          }


          /*
            Save JWT/session information.
          */

          saveAuth(
            data,
            remember
          );


          showMessage(
            "Login successful! Redirecting...",
            "success"
          );


          /*
            If user was trying to checkout,
            return them to checkout.
          */

          const redirect =
            sessionStorage.getItem(
              "shoplyRedirectAfterLogin"
            );


          sessionStorage.removeItem(
            "shoplyRedirectAfterLogin"
          );


          setTimeout(() => {

            if (redirect) {

              window.location.href =
                redirect;

            } else {

              window.location.href =
                "index.html";

            }

          }, 700);


        } catch (error) {

          console.error(
            "Shoply login error:",
            error
          );


          showMessage(
            error.message ||
            "Unable to login. Please try again.",
            "error"
          );


          setLoading(
            loginBtn,
            false,
            "Signing in...",
            "Login to Shoply"
          );

        }

      }
    );

  }


  /* =========================================================
     REGISTER
     ========================================================= */

  if (registerForm) {

    registerForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        clearMessage();


        const name =
          document.getElementById(
            "registerName"
          )?.value
            .trim();


        const email =
          document.getElementById(
            "registerEmail"
          )?.value
            .trim()
            .toLowerCase();


        const phone =
          document.getElementById(
            "registerPhone"
          )?.value
            .trim();


        const password =
          document.getElementById(
            "registerPassword"
          )?.value || "";


        const confirmPassword =
          document.getElementById(
            "confirmPassword"
          )?.value || "";


        /* -------------------------
           VALIDATION
        ------------------------- */

        if (!name) {

          showMessage(
            "Please enter your full name.",
            "error"
          );

          return;

        }


        if (name.length < 2) {

          showMessage(
            "Name must contain at least 2 characters.",
            "error"
          );

          return;

        }


        if (!email) {

          showMessage(
            "Please enter your email address.",
            "error"
          );

          return;

        }


        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
          )
        ) {

          showMessage(
            "Please enter a valid email address.",
            "error"
          );

          return;

        }


        if (
          phone &&
          !/^[0-9]{10}$/.test(phone)
        ) {

          showMessage(
            "Please enter a valid 10 digit mobile number.",
            "error"
          );

          return;

        }


        if (password.length < 6) {

          showMessage(
            "Password must contain at least 6 characters.",
            "error"
          );

          return;

        }


        if (
          password !==
          confirmPassword
        ) {

          showMessage(
            "Passwords do not match.",
            "error"
          );

          return;

        }


        setLoading(
          registerBtn,
          true,
          "Creating account...",
          "Create My Account"
        );


        try {

          /*
            Main backend registration endpoint.
          */

          const response =
            await fetch(
              "/api/auth/register",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                  name,
                  email,
                  phone,
                  password
                })
              }
            );


          let data = {};

          try {

            data =
              await response.json();

          } catch {

            data = {};

          }


          if (!response.ok) {

            throw new Error(
              data.message ||
              data.error ||
              "Unable to create account."
            );

          }


          /*
            Some backends automatically log the
            user in after registration.
          */

          const token =
            data.token ||
            data.accessToken ||
            data.jwt;


          if (token) {

            saveAuth(
              data,
              true
            );


            showMessage(
              "Account created successfully! Redirecting...",
              "success"
            );


            setTimeout(() => {

              window.location.href =
                "index.html";

            }, 800);


            return;

          }


          /*
            If backend requires login after
            registration, switch to login tab.
          */

          showMessage(
            data.message ||
            "Account created successfully. Please login.",
            "success"
          );


          registerForm.reset();


          const loginTab =
            document.getElementById(
              "loginTab"
            );


          if (loginTab) {

            loginTab.click();

          }


          const loginEmail =
            document.getElementById(
              "loginEmail"
            );


          if (loginEmail) {

            loginEmail.value =
              email;

          }


        } catch (error) {

          console.error(
            "Shoply registration error:",
            error
          );


          showMessage(
            error.message ||
            "Unable to create account. Please try again.",
            "error"
          );


        } finally {

          setLoading(
            registerBtn,
            false,
            "Creating account...",
            "Create My Account"
          );

        }

      }
    );

  }


  /* =========================================================
     EXPORT AUTH HELPERS
     ========================================================= */

  window.ShoplyAuth = {

    getToken,

    getUser,

    isLoggedIn() {

      return Boolean(
        getToken()
      );

    },


    logout() {

      localStorage.removeItem(
        "shoplyToken"
      );

      localStorage.removeItem(
        "shoplyUser"
      );

      sessionStorage.removeItem(
        "shoplyToken"
      );

      sessionStorage.removeItem(
        "shoplyUser"
      );

      window.location.href =
        "index.html";

    },


    authHeaders() {

      const token =
        getToken();

      if (!token) {

        return {
          "Content-Type":
            "application/json"
        };

      }

      return {

        "Content-Type":
          "application/json",

        "Authorization":
          `Bearer ${token}`

      };

    },


    requireLogin(
      redirect = "login.html"
    ) {

      if (!getToken()) {

        sessionStorage.setItem(
          "shoplyRedirectAfterLogin",
          window.location.href
        );

        window.location.href =
          redirect;

        return false;

      }

      return true;

    }

  };


  /* =========================================================
     AUTO-FILL SAVED USER
     ========================================================= */

  const savedUser =
    getUser();


  if (savedUser) {

    const loginEmail =
      document.getElementById(
        "loginEmail"
      );


    if (
      loginEmail &&
      savedUser.email
    ) {

      loginEmail.value =
        savedUser.email;

    }

  }


});