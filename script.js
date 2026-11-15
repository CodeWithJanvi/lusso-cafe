document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => document.querySelectorAll(selector);

  /* PAGE LOADER */
  const loader = $(".page-loader");
  function hideLoader() { if (loader) loader.style.display = "none"; }
  if (document.readyState === "complete") setTimeout(hideLoader, 1700);
  else window.addEventListener("load", () => setTimeout(hideLoader, 1700));

  /* FOOTER YEAR */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* MARQUEES - duplicate content so the loop is seamless */
  $$("[data-marquee]").forEach(track => {
    track.innerHTML += track.innerHTML;
    track.setAttribute("aria-hidden", "false");
  });

  /* MOBILE NAVIGATION */
  const menuToggle = $("#menuToggle");
  const nav = $("#nav");

  function closeNavigation() {
    if (!nav || !menuToggle) return;
    nav.classList.remove("open");
    menuToggle.textContent = "☰";
    menuToggle.setAttribute("aria-expanded", "false");
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuToggle.textContent = isOpen ? "✕" : "☰";
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeNavigation));
    document.addEventListener("click", event => {
      if (nav.classList.contains("open") && !nav.contains(event.target) && !menuToggle.contains(event.target)) closeNavigation();
    });
  }

  /* SCROLL PROGRESS + PARALLAX */
  const header = $("#header");
  const progressBar = $("#scrollProgress");
  const circleValue = $("#circleValue");
  const scrollPercent = $("#scrollPercent");
  const scrollCircle = $("#scrollCircle");
  const backTop = $("#backTop");
  const heroPhoto = $(".hero-photo");
  const visitPhoto = $(".visit-photo");

  const radius = 25;
  const circumference = 2 * Math.PI * radius;

  if (circleValue) {
    circleValue.style.strokeDasharray = circumference;
    circleValue.style.strokeDashoffset = circumference;
  }

  function updateScroll() {
    const scrollTop = window.scrollY;
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent = totalHeight > 0 ? Math.min(100, Math.round((scrollTop / totalHeight) * 100)) : 0;

    if (progressBar) progressBar.style.width = percent + "%";
    if (scrollPercent) scrollPercent.textContent = percent + "%";
    if (circleValue) circleValue.style.strokeDashoffset = circumference - (percent / 100) * circumference;
    if (header) header.classList.toggle("scrolled", scrollTop > 50);
    if (backTop) backTop.classList.toggle("show", scrollTop > 400);

    // parallax backgrounds
    if (heroPhoto && scrollTop < window.innerHeight * 1.2) heroPhoto.style.setProperty("--py", scrollTop * 0.25 + "px");
    if (visitPhoto) {
      const rect = visitPhoto.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        visitPhoto.style.backgroundPosition = "center " + (50 + (rect.top / window.innerHeight) * 18) + "%";
      }
    }
  }

  let scrollPending = false;
  window.addEventListener("scroll", () => {
    if (scrollPending) return;
    scrollPending = true;
    window.requestAnimationFrame(() => { updateScroll(); scrollPending = false; });
  }, { passive: true });

  window.addEventListener("resize", updateScroll);
  updateScroll();

  scrollCircle?.addEventListener("click", () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }));
  backTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* REVEAL ANIMATIONS */
  const revealElements = $$(".reveal");

  function markVisible(element) {
    element.classList.add("visible");
    const delay = parseFloat((element.style.getPropertyValue("--d") || "0").replace("s", "")) || 0;
    setTimeout(() => element.classList.add("done"), (delay + 1) * 1000);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          markVisible(entry.target);
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });

    revealElements.forEach((element, i) => {
      // automatic stagger for items inside the menu grid
      if (element.classList.contains("menu-card") && !element.style.getPropertyValue("--d")) {
        element.style.setProperty("--d", ((i % 3) * 0.1) + "s");
      }
      observer.observe(element);
    });
  } else {
    revealElements.forEach(markVisible);
  }

  /* MENU FILTERS */
  const filterButtons = $$(".filter-btn");
  const menuCards = $$(".menu-card");

  function applyFilter(filter) {
    filterButtons.forEach(item => item.classList.toggle("active", item.dataset.filter === filter));
    let order = 0;
    menuCards.forEach(card => {
      const show = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("hidden", !show);
      card.classList.remove("pop");
      if (show) {
        // make sure cards revealed by filter are visible, then play the pop animation
        card.classList.add("visible", "done");
        void card.offsetWidth;
        card.style.animationDelay = (order++ * 0.07) + "s";
        card.classList.add("pop");
      }
    });
  }

  filterButtons.forEach(button => button.addEventListener("click", () => applyFilter(button.dataset.filter)));

  /* CATEGORY FLIP CARDS */
  const canHover = window.matchMedia("(hover: hover)").matches;
  const flipCards = $$(".flip-card");

  flipCards.forEach(card => {
    card.addEventListener("click", () => {
      // on touch devices the first tap flips, the second tap opens the category
      if (!canHover && !card.classList.contains("flipped")) {
        flipCards.forEach(c => c.classList.remove("flipped"));
        card.classList.add("flipped");
        return;
      }
      applyFilter(card.dataset.jump);
      const target = $(".menu-filters");
      if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" });
    });
  });

  /* BEST SELLER SLIDER (arrows, dots, drag/swipe, autoplay) */
  const slider = $("#bestSlider");

  if (slider) {
    const viewport = slider.querySelector(".slider-viewport");
    const track = slider.querySelector(".slider-track");
    const slides = Array.from(track.children);
    const dotsWrap = slider.querySelector(".slider-dots");
    const prevBtn = slider.querySelector(".prev");
    const nextBtn = slider.querySelector(".next");

    let index = 0;
    let autoTimer = null;
    let dragStartX = 0;
    let dragDelta = 0;
    let dragging = false;

    const perView = () => window.innerWidth <= 550 ? 1 : window.innerWidth <= 1100 ? 2 : 3;
    const maxIndex = () => Math.max(0, slides.length - perView());
    const stepSize = () => slides[0].offsetWidth + 24;

    function buildDots() {
      dotsWrap.innerHTML = "";
      for (let i = 0; i <= maxIndex(); i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", "Go to slide " + (i + 1));
        dot.addEventListener("click", () => { goTo(i); restartAuto(); });
        dotsWrap.appendChild(dot);
      }
    }

    function render(extra = 0) {
      track.style.transform = `translateX(${-index * stepSize() + extra}px)`;
      Array.from(dotsWrap.children).forEach((dot, i) => dot.classList.toggle("active", i === index));
    }

    function goTo(i) {
      index = i > maxIndex() ? 0 : i < 0 ? maxIndex() : i; // loops around
      render();
    }

    function startAuto() { autoTimer = setInterval(() => goTo(index + 1), 3800); }
    function restartAuto() { clearInterval(autoTimer); startAuto(); }

    prevBtn.addEventListener("click", () => { goTo(index - 1); restartAuto(); });
    nextBtn.addEventListener("click", () => { goTo(index + 1); restartAuto(); });

    viewport.addEventListener("pointerdown", e => {
      dragging = true;
      dragStartX = e.clientX;
      dragDelta = 0;
      track.classList.add("no-anim");
      viewport.classList.add("dragging");
      clearInterval(autoTimer);
    });

    window.addEventListener("pointermove", e => {
      if (!dragging) return;
      dragDelta = e.clientX - dragStartX;
      render(dragDelta);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove("no-anim");
      viewport.classList.remove("dragging");
      if (dragDelta < -60) goTo(Math.min(index + 1, maxIndex()));
      else if (dragDelta > 60) goTo(Math.max(index - 1, 0));
      else render();
      startAuto();
    }

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    slider.addEventListener("mouseenter", () => clearInterval(autoTimer));
    slider.addEventListener("mouseleave", () => { clearInterval(autoTimer); startAuto(); });

    window.addEventListener("resize", () => { buildDots(); goTo(Math.min(index, maxIndex())); });

    buildDots();
    render();
    startAuto();
  }

  /* LIKE BUTTONS (most loved dishes) */
  const LIKES_KEY = "oasisCafeLikedDishes";

  function getLiked() {
    try { return JSON.parse(localStorage.getItem(LIKES_KEY)) || []; }
    catch (error) { return []; }
  }

  function saveLiked(list) {
    try { localStorage.setItem(LIKES_KEY, JSON.stringify(list)); }
    catch (error) { /* storage unavailable - ignore */ }
  }

  const formatCount = n => n.toLocaleString("en-IN");

  $$(".like-btn").forEach(button => {
    const id = button.dataset.id;
    const base = Number(button.dataset.base) || 0;
    const counter = button.closest(".loved-card").querySelector(".like-count");

    function paint() {
      const liked = getLiked().includes(id);
      button.classList.toggle("liked", liked);
      button.setAttribute("aria-pressed", String(liked));
      counter.textContent = formatCount(base + (liked ? 1 : 0));
    }

    paint();

    button.addEventListener("click", () => {
      let list = getLiked();
      const wasLiked = list.includes(id);
      list = wasLiked ? list.filter(item => item !== id) : [...list, id];
      saveLiked(list);
      paint();

      if (!wasLiked) {
        const rect = button.getBoundingClientRect();
        for (let i = 0; i < 6; i++) {
          const heart = document.createElement("span");
          heart.className = "float-heart";
          heart.textContent = "♥";
          heart.style.left = rect.left + rect.width / 2 + "px";
          heart.style.top = rect.top + rect.height / 2 + "px";
          heart.style.setProperty("--x", (Math.random() * 80 - 40) + "px");
          heart.style.animationDelay = (i * 0.07) + "s";
          document.body.appendChild(heart);
          setTimeout(() => heart.remove(), 1400);
        }
      }
    });
  });

  /* SUCCESS SOUND */
  let audioContext = null;

  function getAudioContext() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    return audioContext;
  }

  ["pointerdown", "touchstart", "keydown"].forEach(type => {
    document.addEventListener(type, () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") ctx.resume();
    }, { once: true, passive: true });
  });

  function playSuccessSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    [[880, 0], [1174.66, 0.11], [1567.98, 0.22]].forEach(([frequency, delay]) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + delay;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.6);
    });
  }

  /* BOOKING FORM */
  const bookingForm = $("#bookingForm");
  const bookingSubmit = $("#bookingSubmit");
  const bookingStatus = $("#bookingStatus");
  const guestDate = $("#guestDate");
  const guestTime = $("#guestTime");
  const STORAGE_KEY = "oasisCafeBookingRequests";

  function localDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (guestDate) guestDate.min = localDateString();

  function showBookingError(message) { if (bookingStatus) bookingStatus.textContent = message; }
  function clearBookingError() { if (bookingStatus) bookingStatus.textContent = ""; }

  guestDate?.addEventListener("change", clearBookingError);
  guestTime?.addEventListener("change", clearBookingError);

  function createReference() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `OASIS-${timestamp}-${random}`;
  }

  function getBookings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Could not read saved bookings:", error);
      return [];
    }
  }

  function saveBooking(booking) {
    const bookings = getBookings();
    bookings.push(booking);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }

  /* RECEIPT */
  function setReceiptValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || "-";
  }

  function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatTime(timeString) {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  function displayReceipt(booking) {
    setReceiptValue("receiptBookingId", booking.reference);
    setReceiptValue("receiptName", booking.name);
    setReceiptValue("receiptPhone", booking.phone);
    setReceiptValue("receiptDate", formatDate(booking.date));
    setReceiptValue("receiptTime", formatTime(booking.time));
    setReceiptValue("receiptGuests", booking.guests + (booking.guests === "1" ? " Person" : " People"));
    setReceiptValue("receiptMessage", booking.message || "None");
  }

  /* SUCCESS POPUP */
  const successModal = $("#successModal");
  const successClose = $("#successClose");
  const doneBooking = $("#doneBooking");

  function openSuccessModal() {
    if (!successModal) return;
    successModal.classList.add("show");
    successModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    playSuccessSound();
    if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
    doneBooking?.focus();
  }

  function closeSuccessModal() {
    if (!successModal) return;
    successModal.classList.remove("show");
    successModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  successClose?.addEventListener("click", closeSuccessModal);
  doneBooking?.addEventListener("click", closeSuccessModal);
  successModal?.addEventListener("click", event => { if (event.target === successModal) closeSuccessModal(); });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeSuccessModal();
      closeChat();
      closeNavigation();
    }
  });

  /* PRINT RECEIPT */
  const printReceipt = $("#printReceipt");
  printReceipt?.addEventListener("click", () => {
    if (!successModal?.classList.contains("show")) return;
    window.print();
  });

  /* BOOKING SUBMIT */
  if (bookingForm) {
    bookingForm.addEventListener("submit", event => {
      event.preventDefault();
      clearBookingError();

      if (!bookingForm.reportValidity()) return;

      const name = $("#guestName").value.trim();
      const phone = $("#guestPhone").value.trim();
      const date = guestDate.value;
      const time = guestTime.value;
      const guests = $("#guestCount").value;
      const message = $("#guestMessage").value.trim();

      if (!name || !phone || !date || !time || !guests) {
        showBookingError("Please complete all required fields.");
        return;
      }

      if (date < localDateString()) {
        showBookingError("Please select today or a future date.");
        guestDate.focus();
        return;
      }

      if (date === localDateString()) {
        const [hours, minutes] = time.split(":");
        const selectedDateTime = new Date();
        selectedDateTime.setHours(Number(hours), Number(minutes), 0, 0);
        if (selectedDateTime <= new Date()) {
          showBookingError("Please select a future time for today's reservation.");
          guestTime.focus();
          return;
        }
      }

      const booking = {
        reference: createReference(), name, phone, date, time, guests, message,
        createdAt: new Date().toISOString(), status: "Request Received"
      };

      if (bookingSubmit) {
        bookingSubmit.disabled = true;
        bookingSubmit.textContent = "Please wait...";
      }

      try {
        saveBooking(booking);
        displayReceipt(booking);
        bookingForm.reset();
        if (guestDate) guestDate.min = localDateString();
        openSuccessModal();
      } catch (error) {
        console.error("Booking save error:", error);
        showBookingError("Unable to save your request in this browser. Please try again.");
      } finally {
        if (bookingSubmit) {
          bookingSubmit.disabled = false;
          bookingSubmit.innerHTML = 'Send Booking Request <span>↗</span>';
        }
      }
    });
  }

  /* CHATBOT */
  const chatLauncher = $("#chatLauncher");
  const chatPanel = $("#chatPanel");
  const chatClose = $("#chatClose");
  const chatInput = $("#chatInput");
  const chatMessages = $("#chatMessages");
  const chatForm = $("#chatForm");

  function openChat() {
    if (!chatPanel) return;
    chatPanel.classList.add("open");
    chatPanel.setAttribute("aria-hidden", "false");
    setTimeout(() => chatInput?.focus(), 200);
  }

  function closeChat() {
    if (!chatPanel) return;
    chatPanel.classList.remove("open");
    chatPanel.setAttribute("aria-hidden", "true");
  }

  chatLauncher?.addEventListener("click", () => {
    if (chatPanel?.classList.contains("open")) closeChat();
    else openChat();
  });

  chatClose?.addEventListener("click", closeChat);

  function addChatMessage(message, sender = "bot") {
    if (!chatMessages) return;
    const bubble = document.createElement("div");
    bubble.className = sender === "user" ? "chat-bubble user-message" : "chat-bubble bot-message";
    bubble.textContent = message;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function getBotReply(question) {
    const text = question.toLowerCase();
    const has = (...words) => words.some(word => text.includes(word));

    if (has("menu", "food", "coffee", "drink", "price")) {
      return "Explore our Coffee, Drinks, Desserts and Bites in the Menu section. Our best sellers include Classic Cappuccino, Chocolate Delight and Velvet Latte. ☕";
    }
    if (has("book", "reserv", "table")) {
      return "You can request a table using our reservation form. Enter your name, phone number, date, time and guest count. Please call our team to confirm availability.";
    }
    if (has("contact", "phone", "number", "call")) {
      return "You can call Oasis Cafe at +91 99133 92008. We look forward to hearing from you!";
    }
    if (has("location", "address", "where")) {
      return "Please contact our team at +91 99133 92008 for the cafe address and directions.";
    }
    if (has("time", "hour", "open", "close")) {
      return "For today's opening hours, please call our team at +91 99133 92008.";
    }
    if (has("offer", "discount", "special")) {
      return "We feature seasonal specials and in-cafe offers. Please ask our team about the latest offers during your visit.";
    }
    if (has("thank")) {
      return "You're very welcome! We hope to see you soon at Oasis Cafe. ☕";
    }
    if (has("hello", "hi", "hey")) {
      return "Hello! Welcome to Oasis Cafe. ☕ Would you like to explore our menu, request a table or contact our team?";
    }
    return "Thank you for your message! For more specific help, explore our website or call Oasis Cafe at +91 99133 92008.";
  }

  function sendChatMessage(message) {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    addChatMessage(cleanMessage, "user");
    const reply = getBotReply(cleanMessage);
    setTimeout(() => addChatMessage(reply, "bot"), 450);
  }

  chatForm?.addEventListener("submit", event => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    sendChatMessage(message);
    chatInput.value = "";
    chatInput.focus();
  });

  $$(".quick-questions button").forEach(button => {
    button.addEventListener("click", () => {
      const question = button.dataset.question;
      if (question) sendChatMessage(question);
    });
  });

  /* FAQ ACCORDION */
  const faqItems = $$(".faq-list details");
  faqItems.forEach(item => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      faqItems.forEach(otherItem => { if (otherItem !== item) otherItem.open = false; });
    });
  });

});
