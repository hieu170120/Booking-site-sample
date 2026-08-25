/**
 * Mini Client-Side SPA Router for Lumière Hair & Spa
 * Keeps ez-chat-widget alive across all page navigations and resolves routes accurately.
 */
(function () {
  // Determine site root dynamically (works on Vercel "/", GitHub Pages "/repo/", or local subfolders)
  function getAppRoot() {
    const pathname = window.location.pathname;
    const previewIdx = pathname.indexOf("/preview/");
    if (previewIdx !== -1) {
      return pathname.substring(0, previewIdx + 1);
    }
    const lastSlash = pathname.lastIndexOf("/");
    if (lastSlash !== -1) {
      return pathname.substring(0, lastSlash + 1);
    }
    return "/";
  }

  function resolveRoute(href) {
    if (!href) return "";
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("//")
    ) {
      return href;
    }

    const appRoot = getAppRoot();
    const origin = window.location.origin;

    // Handle hash links (e.g. #story, #contact)
    if (href.startsWith("#")) {
      const pathname = window.location.pathname;
      const isHome = pathname === appRoot || 
                     pathname === appRoot + "index.html" || 
                     !pathname.includes("/preview/");
      if (isHome) {
        return href; // Keep hash for in-page smooth scroll
      } else {
        return origin + appRoot + "index.html" + href;
      }
    }

    // Strip existing queries/hashes for clean matching
    const urlParts = href.split("#");
    const basePart = urlParts[0].split("?")[0];
    const hash = urlParts.length > 1 ? "#" + urlParts[1] : "";

    // Extract pure filename
    const filename = basePart.substring(basePart.lastIndexOf("/") + 1) || "index.html";

    if (filename === "index.html" || filename === "") {
      return origin + appRoot + "index.html" + hash;
    }
    if (
      filename === "services.html" ||
      filename === "cut-styling.html" ||
      filename === "signature-color.html" ||
      filename === "deep-restoration.html" ||
      filename === "stylists.html" ||
      filename === "booking-flow.html" ||
      filename === "booking-confirmed.html"
    ) {
      return origin + appRoot + "preview/" + filename + hash;
    }

    // Default URL resolution
    try {
      return new URL(href, origin + appRoot).href;
    } catch (e) {
      return href;
    }
  }

  const loadingBar = document.getElementById("spa-loading-bar") || createLoadingBar();

  function createLoadingBar() {
    const bar = document.createElement("div");
    bar.id = "spa-loading-bar";
    document.body.appendChild(bar);
    return bar;
  }

  function startLoading() {
    loadingBar.className = "loading";
  }

  function finishLoading() {
    loadingBar.className = "done";
    setTimeout(() => {
      loadingBar.className = "";
    }, 300);
  }

  function updateActiveNav() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach((a) => {
      const resolved = resolveRoute(a.getAttribute("href"));
      if (!resolved || resolved.startsWith("#")) {
        a.classList.remove("active");
        return;
      }
      try {
        const u = new URL(resolved);
        if (u.pathname === currentPath || (currentPath.endsWith("/") && u.pathname.endsWith("/index.html"))) {
          a.classList.add("active");
        } else {
          a.classList.remove("active");
        }
      } catch (e) {}
    });
  }

  // Intercept clicks on links
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    // External or special protocols
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      link.hasAttribute("download") ||
      link.getAttribute("target") === "_blank"
    ) {
      return;
    }

    const resolved = resolveRoute(href);

    // If pure hash on current page
    if (resolved.startsWith("#")) {
      const el = document.querySelector(resolved);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    e.preventDefault();
    if (resolved !== window.location.href) {
      const hash = resolved.includes("#") ? "#" + resolved.split("#")[1] : null;
      navigateTo(resolved, true, hash);
    }
  });

  async function navigateTo(url, push = true, scrollHash = null) {
    startLoading();
    try {
      const fetchUrl = url.split("#")[0];
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Status " + response.status + " fetching " + fetchUrl);

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const newMain = doc.querySelector("main");
      const currentMain = document.querySelector("main");

      if (newMain && currentMain) {
        currentMain.innerHTML = newMain.innerHTML;
        currentMain.id = newMain.id || "app-main";
        currentMain.className = newMain.className || "";

        // Fix relative image paths in injected content
        const appRoot = getAppRoot();
        const origin = window.location.origin;
        currentMain.querySelectorAll('img[src^="assets/"]').forEach((img) => {
          img.src = origin + appRoot + img.getAttribute("src");
        });
      } else {
        window.location.href = url;
        return;
      }

      if (doc.title) {
        document.title = doc.title;
      }

      if (push) {
        history.pushState({ url }, doc.title, url);
      }

      updateActiveNav();
      initPageInteractions();

      if (scrollHash) {
        setTimeout(() => {
          const targetEl = document.querySelector(scrollHash);
          if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
        }, 50);
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }

      window.dispatchEvent(new Event("popstate"));
      window.dispatchEvent(new CustomEvent("pagechange", { detail: { url } }));
    } catch (err) {
      console.warn("SPA Navigation fallback:", err);
      window.location.href = url;
    } finally {
      finishLoading();
    }
  }

  window.addEventListener("popstate", () => {
    navigateTo(window.location.href, false);
  });

  function initPageInteractions() {
    // Menu mobile toggle
    const menu = document.querySelector(".nav-links");
    const toggle = document.querySelector(".menu-toggle");
    if (toggle && menu) {
      toggle.onclick = () => {
        const open = menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open);
        document.body.classList.toggle("menu-open", open);
      };
      menu.onclick = (event) => {
        if (event.target.closest("a")) {
          menu.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          document.body.classList.remove("menu-open");
        }
      };
    }

    // Interactive booking form preview
    const bookingForm = document.getElementById("preview-booking-form");
    if (bookingForm) {
      bookingForm.onsubmit = (e) => {
        e.preventDefault();
        const service = document.getElementById("book-service")?.value || "Cut & Styling";
        const stylist = document.querySelector('input[name="stylist"]:checked')?.value || "Lan Nguyen";
        const date = document.getElementById("book-date")?.value || "2026-07-05";
        const time = document.getElementById("book-time")?.value || "14:00";
        const name = document.getElementById("book-name")?.value || "Ha Nguyen";
        const phone = document.getElementById("book-phone")?.value || "0901234567";

        sessionStorage.setItem(
          "latest_booking",
          JSON.stringify({
            service,
            stylist,
            date,
            time,
            name,
            phone,
            id: "LMR-" + Math.floor(1000 + Math.random() * 9000),
          })
        );

        const confirmUrl = resolveRoute("preview/booking-confirmed.html");
        navigateTo(confirmUrl, true);
      };
    }

    // Populate confirmation data
    const confirmContainer = document.getElementById("confirmed-details");
    if (confirmContainer) {
      const stored = sessionStorage.getItem("latest_booking");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const serviceEl = document.getElementById("conf-service");
          const stylistEl = document.getElementById("conf-stylist");
          const datetimeEl = document.getElementById("conf-datetime");
          const nameEl = document.getElementById("conf-name");
          const codeEl = document.getElementById("conf-code");
          if (serviceEl) serviceEl.textContent = data.service;
          if (stylistEl) stylistEl.textContent = data.stylist;
          if (datetimeEl) datetimeEl.textContent = `${data.date} at ${data.time}`;
          if (nameEl) nameEl.textContent = `${data.name} (${data.phone})`;
          if (codeEl) codeEl.textContent = `#${data.id}`;
        } catch (e) {}
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPageInteractions();
    updateActiveNav();
  });
})();
