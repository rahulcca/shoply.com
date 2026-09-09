/* =========================================================
   SHOPLY — FUTURISTIC INTERACTION ENGINE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* ===============================
       NAVBAR SCROLL EFFECT
    =============================== */

    const navbar = document.querySelector(".navbar");

    function handleNavbar() {
        if (!navbar) return;

        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    }

    window.addEventListener("scroll", handleNavbar, {
        passive: true
    });

    handleNavbar();


    /* ===============================
       PARALLAX SCROLL
    =============================== */

    let ticking = false;

    window.addEventListener("scroll", () => {

        if (!ticking) {

            window.requestAnimationFrame(() => {

                document.documentElement.style
                    .setProperty(
                        "--scrollY",
                        `${window.scrollY}px`
                    );

                ticking = false;
            });

            ticking = true;
        }

    }, {
        passive: true
    });


    /* ===============================
       SCROLL REVEAL
    =============================== */

    const revealElements =
        document.querySelectorAll(
            ".reveal, .reveal-left, .reveal-right"
        );

    const revealObserver =
        new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("active");

                        revealObserver.unobserve(
                            entry.target
                        );
                    }

                });

            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -60px 0px"
            }
        );

    revealElements.forEach((element) => {
        revealObserver.observe(element);
    });


    /* ===============================
       CARD LIGHT TRACKER
    =============================== */

    const cards =
        document.querySelectorAll(
            ".category-card, .product-card"
        );

    cards.forEach((card) => {

        card.addEventListener("mousemove", (event) => {

            const rect =
                card.getBoundingClientRect();

            const x =
                ((event.clientX - rect.left) /
                    rect.width) * 100;

            const y =
                ((event.clientY - rect.top) /
                    rect.height) * 100;

            card.style.setProperty(
                "--mx",
                `${x}%`
            );

            card.style.setProperty(
                "--my",
                `${y}%`
            );

        });

    });


    /* ===============================
       3D PRODUCT TILT
    =============================== */

    const productCards =
        document.querySelectorAll(
            ".product-card"
        );

    productCards.forEach((card) => {

        card.addEventListener(
            "mousemove",
            (event) => {

                if (window.innerWidth < 800) {
                    return;
                }

                const rect =
                    card.getBoundingClientRect();

                const x =
                    event.clientX -
                    rect.left;

                const y =
                    event.clientY -
                    rect.top;

                const centerX =
                    rect.width / 2;

                const centerY =
                    rect.height / 2;

                const rotateX =
                    ((y - centerY) /
                        centerY) * -3;

                const rotateY =
                    ((x - centerX) /
                        centerX) * 3;

                card.style.transform =
                    `perspective(900px)
                     rotateX(${rotateX}deg)
                     rotateY(${rotateY}deg)
                     translateY(-10px)`;
            }
        );

        card.addEventListener(
            "mouseleave",
            () => {

                card.style.transform =
                    "";
            }
        );

    });


    /* ===============================
       SMOOTH ANCHOR SCROLL
    =============================== */

    document.querySelectorAll(
        'a[href^="#"]'
    ).forEach((link) => {

        link.addEventListener(
            "click",
            (event) => {

                const targetId =
                    link.getAttribute("href");

                if (
                    !targetId ||
                    targetId === "#"
                ) {
                    return;
                }

                const target =
                    document.querySelector(
                        targetId
                    );

                if (!target) {
                    return;
                }

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }
        );

    });


    /* ===============================
       BUTTON RIPPLE
    =============================== */

    document.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    ".btn, .add-cart"
                );

            if (!button) return;

            const ripple =
                document.createElement(
                    "span"
                );

            ripple.style.position =
                "absolute";

            ripple.style.width =
                "10px";

            ripple.style.height =
                "10px";

            ripple.style.borderRadius =
                "50%";

            ripple.style.background =
                "rgba(255,255,255,.5)";

            ripple.style.pointerEvents =
                "none";

            ripple.style.transform =
                "translate(-50%,-50%) scale(1)";

            ripple.style.animation =
                "shoplyRipple .6s ease-out forwards";

            const rect =
                button.getBoundingClientRect();

            ripple.style.left =
                `${event.clientX - rect.left}px`;

            ripple.style.top =
                `${event.clientY - rect.top}px`;

            button.style.position =
                "relative";

            button.style.overflow =
                "hidden";

            button.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 650);

        }
    );


    /* ===============================
       DYNAMIC RIPPLE CSS
    =============================== */

    if (
        !document.getElementById(
            "shoply-ripple-style"
        )
    ) {

        const style =
            document.createElement("style");

        style.id =
            "shoply-ripple-style";

        style.textContent = `
            @keyframes shoplyRipple {
                to {
                    width: 350px;
                    height: 350px;
                    opacity: 0;
                }
            }
        `;

        document.head.appendChild(style);
    }


    /* ===============================
       ACTIVE SECTION COLOUR
    =============================== */

    const sections =
        document.querySelectorAll(
            "section[data-theme]"
        );

    if (sections.length) {

        const sectionObserver =
            new IntersectionObserver(
                (entries) => {

                    entries.forEach(
                        (entry) => {

                            if (
                                entry.isIntersecting
                            ) {

                                const theme =
                                    entry.target
                                        .dataset
                                        .theme;

                                document.body.style
                                    .background =
                                    theme ||
                                    "";
                            }

                        }
                    );

                },
                {
                    threshold: .45
                }
            );

        sections.forEach(
            (section) => {
                sectionObserver.observe(
                    section
                );
            }
        );
    }


    /* ===============================
       CURSOR GLOW
    =============================== */

    const glow =
        document.createElement("div");

    glow.style.position =
        "fixed";

    glow.style.width =
        "220px";

    glow.style.height =
        "220px";

    glow.style.borderRadius =
        "50%";

    glow.style.pointerEvents =
        "none";

    glow.style.zIndex =
        "-1";

    glow.style.background =
        "radial-gradient(circle, rgba(0,234,255,.07), transparent 70%)";

    glow.style.transform =
        "translate(-50%,-50%)";

    glow.style.filter =
        "blur(15px)";

    document.body.appendChild(glow);

    window.addEventListener(
        "mousemove",
        (event) => {

            glow.style.left =
                `${event.clientX}px`;

            glow.style.top =
                `${event.clientY}px`;
        },
        {
            passive: true
        }
    );


    /* ===============================
       CONSOLE BRAND
    =============================== */

    console.log(
        "%c SHOPLY 🚀 ",
        "font-size:24px;font-weight:900;color:#00eaff;"
    );

    console.log(
        "%c Future of Shopping ",
        "font-size:14px;color:#8b5cf6;"
    );

});