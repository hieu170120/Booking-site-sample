/**
 * Mini Client-Side SPA Router for Lumière Hair & Spa
 * Keeps ez-chat-widget alive across all page navigations.
 */
(function () {
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

  function updateActiveNav(targetPath) {
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) {
        a.classList.remove("active");
        return;
      }
      // Check relative match
      const url = new URL(a.href, window.location.href);
      if (url.pathname === window.location.pathname) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
  }

  // Intercept click on links
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    // Ignore external links, mailto, tel, pure hashes
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

    // If it's a hash on the current page
    if (href.startsWith("#")) {
      // If we are not on index.html/root, navigate to index.html with hash
      const isRoot = window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("/");
      if (!isRoot) {
        e.preventDefault();
        const rootUrl = new URL("../index.html" + href, window.location.href);
        navigateTo(rootUrl.href, true, href);
      }
      return;
    }

    // Internal navigation
    e.preventDefault();
    const destination = new URL(href, window.location.href).href;
    if (destination !== window.location.href) {
      navigateTo(destination, true);
    }
  });

  async function navigateTo(url, push = true, scrollHash = null) {
    startLoading();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load page " + url);

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const newMain = doc.querySelector("main");
      const currentMain = document.querySelector("main");

      if (newMain && currentMain) {
        currentMain.innerHTML = newMain.innerHTML;
        currentMain.id = newMain.id || "app-main";
        currentMain.className = newMain.className || "";
      } else {
        window.location.href = url;
        return;
      }

      // Update title
      if (doc.title) {
        document.title = doc.title;
      }

      // Update URL in browser history
      if (push) {
        history.pushState({ url }, doc.title, url);
      }

      // Update active nav
      updateActiveNav(url);

      // Re-init interactive components on the new page
      initPageInteractions();

      // Scroll to hash or top
      if (scrollHash) {
        const targetEl = document.querySelector(scrollHash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }

      // Dispatch custom location change event in case chat widget listens to URL changes
      window.dispatchEvent(new Event("popstate"));
      window.dispatchEvent(new CustomEvent("pagechange", { detail: { url } }));
    } catch (err) {
      console.warn("SPA router fallback to full navigation:", err);
      window.location.href = url;
    } finally {
      finishLoading();
    }
  }

  // Handle browser Back/Forward buttons
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

    // Interactive booking form preview (if present)
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

        // Pass details via sessionStorage or URL params
        sessionStorage.setItem(
          "latest_booking",
          JSON.stringify({ service, stylist, date, time, name, phone, id: "LMR-" + Math.floor(1000 + Math.random() * 9000) })
        );

        const confirmUrl = new URL("booking-confirmed.html", window.location.href).href;
        navigateTo(confirmUrl, true);
      };
    }

    // Populate confirmation data if on booking-confirmed page
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

  // Initial run
  document.addEventListener("DOMContentLoaded", () => {
    initPageInteractions();
    updateActiveNav(window.location.href);
  });
})();
