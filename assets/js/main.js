/**
 * DERMACLINIC — Premium Dermatology & Skin Clinic
 * Main JavaScript File
 * Version: 1.0.0
 */

'use strict';

/* ==========================================================================
   1. UTILITY HELPERS
   ========================================================================== */

/**
 * Shorthand query selector helpers
 */
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/**
 * Debounce function
 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function
 */
function throttle(fn, limit = 100) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if element is in viewport
 */
function isInViewport(el, threshold = 0) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) - threshold &&
    rect.bottom >= 0
  );
}

/**
 * Get stored preference from localStorage with fallback
 */
function getPreference(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Save preference to localStorage silently
 */
function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage not available; silently fail
  }
}

/* ==========================================================================
   2. THEME TOGGLE (DARK / LIGHT MODE)
   ========================================================================== */

const ThemeManager = {
  storageKey: 'dc-theme',
  current: 'light',

  init() {
    // Determine initial theme: stored pref -> system pref -> default light
    const stored = getPreference(this.storageKey);
    if (stored === 'dark' || stored === 'light') {
      this.current = stored;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.current = prefersDark ? 'dark' : 'light';
    }
    this.apply(this.current, false);
    this.bindControls();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!getPreference(this.storageKey)) {
        this.apply(e.matches ? 'dark' : 'light', false);
      }
    });
  },

  apply(theme, save = true) {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Update all theme toggle buttons
    $$('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      const icon = btn.querySelector('[data-theme-icon]');
      if (icon) {
        icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
      }
    });

    // Update toggle options styling
    $$('.theme-toggle__option').forEach((opt) => {
      opt.classList.toggle('is-active', opt.dataset.themeValue === theme);
    });

    if (save) savePreference(this.storageKey, theme);
  },

  toggle() {
    this.apply(this.current === 'dark' ? 'light' : 'dark');
  },

  bindControls() {
    // Simple toggle buttons with [data-theme-toggle]
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-toggle]');
      if (btn) {
        e.preventDefault();
        this.toggle();
      }

      // Theme option pickers (light/dark labels)
      const opt = e.target.closest('.theme-toggle__option');
      if (opt && opt.dataset.themeValue) {
        this.apply(opt.dataset.themeValue);
      }

      // Toggle switch checkbox
      const toggle = e.target.closest('[data-theme-switch]');
      if (toggle && toggle.type === 'checkbox') {
        this.apply(toggle.checked ? 'dark' : 'light');
      }
    });
  },
};

/* ==========================================================================
   3. RTL TOGGLE
   ========================================================================== */

const RTLManager = {
  storageKey: 'dc-direction',
  current: 'ltr',

  init() {
    const stored = getPreference(this.storageKey, 'ltr');
    this.current = stored === 'rtl' ? 'rtl' : 'ltr';
    this.injectControls();
    this.apply(this.current, false);
    this.bindControls();
  },

  apply(dir, save = true) {
    this.current = dir === 'rtl' ? 'rtl' : 'ltr';
    const isRtl = this.current === 'rtl';

    document.documentElement.setAttribute('dir', this.current);
    document.documentElement.classList.toggle('is-rtl', isRtl);
    this.syncBootstrapStylesheet(isRtl);

    $$('[data-rtl-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isRtl));
      btn.setAttribute('aria-label', isRtl ? 'Switch to left-to-right layout' : 'Switch to right-to-left layout');
      btn.setAttribute('title', isRtl ? 'Switch to LTR layout' : 'Switch to RTL layout');
      btn.classList.toggle('is-active', isRtl);

      const label = btn.querySelector('[data-rtl-label]');
      if (label) label.textContent = isRtl ? 'LTR' : 'RTL';
    });

    // Update toggle switch checkboxes
    $$('[data-rtl-switch]').forEach((el) => {
      if (el.type === 'checkbox') el.checked = isRtl;
    });

    window.dispatchEvent(new CustomEvent('dc:directionchange', { detail: { dir: this.current } }));

    if (save) savePreference(this.storageKey, this.current);
  },

  syncBootstrapStylesheet(enableRtl) {
    const link = document.querySelector(
      'link[href*="bootstrap@"][href*="/css/bootstrap.min.css"], link[href*="bootstrap@"][href*="/css/bootstrap.rtl.min.css"]'
    );
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const isRtlHref = /bootstrap\.rtl\.min\.css/.test(href);

    if (enableRtl && !isRtlHref) {
      if (!link.dataset.ltrHref) link.dataset.ltrHref = href;
      link.setAttribute('href', href.replace('/bootstrap.min.css', '/bootstrap.rtl.min.css'));
    } else if (!enableRtl && isRtlHref) {
      const ltrHref = link.dataset.ltrHref || href.replace('/bootstrap.rtl.min.css', '/bootstrap.min.css');
      link.setAttribute('href', ltrHref);
    }
  },

  injectControls() {
    if ($$('[data-rtl-toggle]').length) return;

    const anchor = $('#themeToggle, #darkToggle, [data-theme-toggle]');
    if (anchor && anchor.parentNode) {
      const btn = anchor.cloneNode(false);
      btn.removeAttribute('id');
      btn.removeAttribute('data-theme-toggle');
      btn.removeAttribute('data-theme-icon');
      btn.setAttribute('type', 'button');
      btn.setAttribute('data-rtl-toggle', '');
      btn.classList.add('rtl-toggle-btn');
      btn.innerHTML = '<span class="rtl-toggle-text" data-rtl-label aria-hidden="true">RTL</span>';
      anchor.insertAdjacentElement('afterend', btn);
      return;
    }

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'rtl-fab';
    fab.setAttribute('data-rtl-toggle', '');
    fab.innerHTML = '<span class="rtl-toggle-text" data-rtl-label aria-hidden="true">RTL</span>';
    document.body.appendChild(fab);
  },

  toggle() {
    this.apply(this.current === 'rtl' ? 'ltr' : 'rtl');
  },

  bindControls() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rtl-toggle]');
      if (btn) {
        e.preventDefault();
        this.toggle();
      }
    });

    document.addEventListener('change', (e) => {
      const sw = e.target.closest('[data-rtl-switch]');
      if (sw && sw.type === 'checkbox') {
        this.apply(sw.checked ? 'rtl' : 'ltr');
      }
    });
  },
};

/* ==========================================================================
   4. STICKY NAVBAR
   ========================================================================== */

const NavbarManager = {
  navbar: null,
  scrollThreshold: 50,
  lastScroll: 0,
  hideOnScroll: false,

  init() {
    this.navbar = $('.navbar');
    if (!this.navbar) return;

    this.onScroll();
    window.addEventListener('scroll', throttle(() => this.onScroll(), 80), { passive: true });
  },

  onScroll() {
    if (!this.navbar) return;
    const currentScroll = window.scrollY || document.documentElement.scrollTop;

    if (currentScroll > this.scrollThreshold) {
      this.navbar.classList.add('navbar--scrolled');
      this.navbar.classList.add('navbar--glass');
      this.navbar.classList.remove('navbar--transparent');
    } else {
      this.navbar.classList.remove('navbar--scrolled');
      // Keep glass if it was set initially
      if (!this.navbar.dataset.initialGlass) {
        this.navbar.classList.remove('navbar--glass');
        this.navbar.classList.add('navbar--transparent');
      }
    }

    this.lastScroll = currentScroll;
  },
};

/* ==========================================================================
   5. MOBILE HAMBURGER MENU
   ========================================================================== */

const MobileNavManager = {
  hamburger: null,
  mobileNav: null,
  overlay: null,
  isOpen: false,

  init() {
    this.hamburger = $('.navbar__hamburger');
    this.mobileNav = $('.navbar__mobile');
    this.overlay   = $('.nav-overlay');

    if (!this.hamburger) return;

    this.hamburger.addEventListener('click', () => this.toggle());

    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    // Close when resizing to desktop
    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth >= 768 && this.isOpen) this.close();
    }, 200));

    // Close when a nav link inside mobile nav is clicked
    if (this.mobileNav) {
      this.mobileNav.addEventListener('click', (e) => {
        if (e.target.closest('a')) this.close();
      });
    }
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.hamburger?.classList.add('is-open');
    this.mobileNav?.classList.add('is-open');
    this.overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    this.hamburger?.setAttribute('aria-expanded', 'true');
  },

  close() {
    this.isOpen = false;
    this.hamburger?.classList.remove('is-open');
    this.mobileNav?.classList.remove('is-open');
    this.overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
    this.hamburger?.setAttribute('aria-expanded', 'false');
  },
};

/* ==========================================================================
   6. SCROLL REVEAL ANIMATIONS (IntersectionObserver)
   ========================================================================== */

const ScrollReveal = {
  observer: null,

  init() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: show all elements immediately
      $$('.reveal').forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const options = {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.1,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          // Stop observing once revealed (performance)
          this.observer.unobserve(entry.target);
        }
      });
    }, options);

    $$('.reveal').forEach((el) => this.observer.observe(el));
  },

  // Programmatically add a new element to observe
  observe(el) {
    if (this.observer) this.observer.observe(el);
  },
};

/* ==========================================================================
   7. SMOOTH SCROLLING
   ========================================================================== */

const SmoothScroll = {
  init() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const targetId = link.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const navbar = $('.navbar');
      const offset = navbar ? navbar.offsetHeight + 16 : 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: 'smooth' });

      // Update URL without jumping
      history.pushState(null, '', targetId);
    });
  },
};

/* ==========================================================================
   8. ACTIVE NAV LINK DETECTION
   ========================================================================== */

const ActiveNav = {
  init() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Desktop nav links
    $$('.navbar__nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && (href === currentPage || href.endsWith(currentPage))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Mobile nav links
    $$('.navbar__mobile-nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && (href === currentPage || href.endsWith(currentPage))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Sidebar links (dashboard)
    $$('.sidebar__link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && (href === currentPage || href.endsWith(currentPage))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  },
};

/* ==========================================================================
   9. FORM VALIDATION
   ========================================================================== */

const FormValidator = {
  // Validation rules
  rules: {
    required: (value) => value.trim() !== '' || 'This field is required.',
    email: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || 'Please enter a valid email address.',
    phone: (value) =>
      /^[\+]?[\d\s\-\(\)]{7,15}$/.test(value.trim()) || 'Please enter a valid phone number.',
    minLength: (min) => (value) =>
      value.trim().length >= min || `Minimum ${min} characters required.`,
    maxLength: (max) => (value) =>
      value.trim().length <= max || `Maximum ${max} characters allowed.`,
    password: (value) =>
      /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value) ||
      'Password must be at least 8 characters with a letter and number.',
    confirmPassword: (original) => (value) =>
      value === original || 'Passwords do not match.',
    checked: (value, el) => el.checked || 'You must accept the terms.',
  },

  init() {
    // Validate on submit
    $$('form[data-validate]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        const valid = this.validateForm(form);
        if (!valid) e.preventDefault();
      });

      // Live validation on blur
      form.addEventListener('blur', (e) => {
        const field = e.target.closest('[data-rules]');
        if (field) this.validateField(field);
      }, true);

      // Clear error on input
      form.addEventListener('input', (e) => {
        const field = e.target.closest('[data-rules]');
        if (field && field.classList.contains('is-invalid')) {
          this.clearError(field);
        }
      });
    });
  },

  validateForm(form) {
    const fields = $$('[data-rules]', form);
    let allValid = true;

    fields.forEach((field) => {
      const valid = this.validateField(field, form);
      if (!valid) allValid = false;
    });

    return allValid;
  },

  validateField(field, form = document) {
    const rulesAttr = field.dataset.rules || '';
    const rulesArr  = rulesAttr.split('|').filter(Boolean);
    const value     = field.value || '';
    let error       = null;

    for (const rule of rulesArr) {
      if (rule === 'required') {
        const result = this.rules.required(value);
        if (result !== true) { error = result; break; }
      } else if (rule === 'email') {
        const result = this.rules.email(value);
        if (result !== true) { error = result; break; }
      } else if (rule === 'phone') {
        const result = this.rules.phone(value);
        if (result !== true) { error = result; break; }
      } else if (rule === 'password') {
        const result = this.rules.password(value);
        if (result !== true) { error = result; break; }
      } else if (rule === 'checked') {
        const result = this.rules.checked(value, field);
        if (result !== true) { error = result; break; }
      } else if (rule.startsWith('min:')) {
        const min = parseInt(rule.split(':')[1]);
        const result = this.rules.minLength(min)(value);
        if (result !== true) { error = result; break; }
      } else if (rule.startsWith('max:')) {
        const max = parseInt(rule.split(':')[1]);
        const result = this.rules.maxLength(max)(value);
        if (result !== true) { error = result; break; }
      } else if (rule.startsWith('confirm:')) {
        const targetName = rule.split(':')[1];
        const target = form.querySelector(`[name="${targetName}"]`);
        if (target) {
          const result = this.rules.confirmPassword(target.value)(value);
          if (result !== true) { error = result; break; }
        }
      }
    }

    if (error) {
      this.showError(field, error);
      return false;
    } else {
      this.showSuccess(field);
      return true;
    }
  },

  showError(field, message) {
    field.classList.remove('is-valid');
    field.classList.add('is-invalid');

    const wrap = field.closest('.form-group') || field.parentElement;
    let errEl = wrap.querySelector('.form-error');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'form-error';
      errEl.setAttribute('role', 'alert');
      wrap.appendChild(errEl);
    }
    errEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="6" r="6"/><text x="6" y="8.5" text-anchor="middle" fill="white" font-size="8" font-weight="bold">!</text></svg> ${message}`;

    // Remove success message if any
    const successEl = wrap.querySelector('.form-success');
    if (successEl) successEl.remove();
  },

  showSuccess(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');

    const wrap = field.closest('.form-group') || field.parentElement;
    const errEl = wrap.querySelector('.form-error');
    if (errEl) errEl.remove();
  },

  clearError(field) {
    field.classList.remove('is-invalid', 'is-valid');
    const wrap = field.closest('.form-group') || field.parentElement;
    const errEl = wrap.querySelector('.form-error');
    if (errEl) errEl.remove();
  },
};

/* ==========================================================================
   10. APPOINTMENT BOOKING UI
   ========================================================================== */

const BookingUI = {
  currentStep: 1,
  selectedDate: null,
  selectedSlot: null,

  init() {
    // Step navigation
    document.addEventListener('click', (e) => {
      const nextBtn = e.target.closest('[data-booking-next]');
      const prevBtn = e.target.closest('[data-booking-prev]');

      if (nextBtn) this.nextStep(nextBtn.closest('[data-booking-widget]'));
      if (prevBtn) this.prevStep(prevBtn.closest('[data-booking-widget]'));

      // Slot selection
      const slot = e.target.closest('.slot:not(.slot--unavailable)');
      if (slot && slot.closest('[data-booking-widget]')) {
        this.selectSlot(slot, slot.closest('[data-booking-widget]'));
      }
    });

    // Calendar day selection
    document.addEventListener('click', (e) => {
      const day = e.target.closest('.mini-calendar__day:not(.mini-calendar__day--other):not(.mini-calendar__day--disabled)');
      if (day) this.selectDate(day);
    });

    // Initialize any mini calendars
    $$('[data-mini-calendar]').forEach((cal) => this.buildCalendar(cal));
  },

  buildCalendar(container, year, month) {
    const now = new Date();
    year  = year  || now.getFullYear();
    month = month || now.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];

    const header = container.querySelector('.mini-calendar__header span') ||
                   container.querySelector('.mini-calendar__title');
    if (header) header.textContent = `${monthNames[month]} ${year}`;

    const grid = container.querySelector('.mini-calendar__grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Day labels
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach((d) => {
      const label = document.createElement('div');
      label.className = 'mini-calendar__day mini-calendar__day--label';
      label.style.cssText = 'font-weight:600;color:var(--text-muted);cursor:default';
      label.textContent = d;
      grid.appendChild(label);
    });

    // Blank padding
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('div');
      blank.className = 'mini-calendar__day mini-calendar__day--other';
      grid.appendChild(blank);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'mini-calendar__day';
      cell.textContent = d;
      cell.dataset.date = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

      const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      const isPast  = new Date(year, month, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (isToday) cell.classList.add('is-today');
      if (isPast)  cell.classList.add('mini-calendar__day--disabled');

      grid.appendChild(cell);
    }

    // Prev / next month buttons
    const prevBtn = container.querySelector('[data-cal-prev]');
    const nextBtn = container.querySelector('[data-cal-next]');

    if (prevBtn) {
      prevBtn.onclick = () => {
        const m = month === 0 ? 11 : month - 1;
        const y = month === 0 ? year - 1 : year;
        this.buildCalendar(container, y, m);
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        const m = month === 11 ? 0 : month + 1;
        const y = month === 11 ? year + 1 : year;
        this.buildCalendar(container, y, m);
      };
    }
  },

  selectDate(dayEl) {
    const cal = dayEl.closest('[data-mini-calendar]');
    if (cal) {
      $$('.mini-calendar__day', cal).forEach((d) => d.classList.remove('is-selected'));
    }
    dayEl.classList.add('is-selected');
    this.selectedDate = dayEl.dataset.date;

    // Fire custom event
    document.dispatchEvent(new CustomEvent('booking:date-selected', { detail: { date: this.selectedDate } }));
  },

  selectSlot(slotEl, widget) {
    if (!widget) return;
    $$('.slot', widget).forEach((s) => s.classList.remove('is-selected'));
    slotEl.classList.add('is-selected');
    this.selectedSlot = slotEl.textContent.trim();

    document.dispatchEvent(new CustomEvent('booking:slot-selected', { detail: { slot: this.selectedSlot } }));
  },

  nextStep(widget) {
    if (!widget) return;
    const steps = $$('[data-booking-step]', widget);
    const current = widget.querySelector('[data-booking-step].is-active');
    if (!current) return;

    const idx = steps.indexOf(current);
    if (idx < steps.length - 1) {
      current.classList.remove('is-active');
      current.style.display = 'none';
      steps[idx + 1].classList.add('is-active');
      steps[idx + 1].style.display = 'block';
      this.currentStep = idx + 2;
      this.updateStepIndicators(widget, this.currentStep);
    }
  },

  prevStep(widget) {
    if (!widget) return;
    const steps = $$('[data-booking-step]', widget);
    const current = widget.querySelector('[data-booking-step].is-active');
    if (!current) return;

    const idx = steps.indexOf(current);
    if (idx > 0) {
      current.classList.remove('is-active');
      current.style.display = 'none';
      steps[idx - 1].classList.add('is-active');
      steps[idx - 1].style.display = 'block';
      this.currentStep = idx;
      this.updateStepIndicators(widget, this.currentStep);
    }
  },

  updateStepIndicators(widget, step) {
    $$('.booking-step', widget).forEach((indicator, i) => {
      indicator.classList.remove('is-active', 'is-done');
      if (i + 1 === step) indicator.classList.add('is-active');
      if (i + 1 < step)  indicator.classList.add('is-done');
    });
  },
};

/* ==========================================================================
   11. FAQ ACCORDION
   ========================================================================== */

const Accordion = {
  init() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.accordion__trigger');
      if (!trigger) return;

      const item    = trigger.closest('.accordion__item');
      const content = item.querySelector('.accordion__content');
      const body    = item.querySelector('.accordion__body');
      const isOpen  = item.classList.contains('is-open');

      // Close other items in the same accordion group (if data-accordion-exclusive)
      const accordion = item.closest('.accordion');
      if (accordion && accordion.dataset.exclusive !== undefined) {
        $$('.accordion__item.is-open', accordion).forEach((openItem) => {
          if (openItem !== item) this.close(openItem);
        });
      }

      isOpen ? this.close(item) : this.open(item);
    });
  },

  open(item) {
    const content = item.querySelector('.accordion__content');
    const body    = item.querySelector('.accordion__body');
    item.classList.add('is-open');
    trigger_aria(item, true);
    if (content && body) {
      content.style.maxHeight = body.scrollHeight + 'px';
    }
  },

  close(item) {
    const content = item.querySelector('.accordion__content');
    item.classList.remove('is-open');
    trigger_aria(item, false);
    if (content) content.style.maxHeight = '0';
  },
};

function trigger_aria(item, expanded) {
  const trigger = item.querySelector('.accordion__trigger');
  if (trigger) trigger.setAttribute('aria-expanded', String(expanded));
}

/* ==========================================================================
   12. TREATMENT FILTER TABS
   ========================================================================== */

const FilterTabs = {
  init() {
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-filter-tab]');
      if (!tab) return;

      const container = tab.closest('[data-filter-container]');
      if (!container) return;

      const filter = tab.dataset.filterTab;

      // Update active tab
      $$('[data-filter-tab]', container).forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      // Filter items
      const items = $$('[data-filter-item]', container);
      items.forEach((item) => {
        const categories = (item.dataset.filterItem || '').split(',').map((s) => s.trim());
        const show = filter === 'all' || categories.includes(filter);

        if (show) {
          item.classList.remove('is-hidden');
          // Trigger reveal animation
          item.style.animation = 'none';
          item.offsetHeight; // reflow
          item.style.animation = 'fade-in-up 0.4s ease both';
        } else {
          item.classList.add('is-hidden');
        }
      });
    });
  },
};

/* ==========================================================================
   13. COUNTER ANIMATION
   ========================================================================== */

const CounterAnimation = {
  observer: null,

  init() {
    if (!('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animate(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    $$('[data-counter]').forEach((el) => this.observer.observe(el));
  },

  animate(el) {
    const target   = parseFloat(el.dataset.counter);
    const duration = parseInt(el.dataset.counterDuration) || 2000;
    const prefix   = el.dataset.counterPrefix || '';
    const suffix   = el.dataset.counterSuffix || '';
    const decimals = parseInt(el.dataset.counterDecimals) || 0;
    const start    = performance.now();

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = target * easeOut(progress);
      el.textContent = prefix + value.toFixed(decimals) + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
      }
    }

    requestAnimationFrame(tick);
  },
};

/* ==========================================================================
   14. IMAGE LIGHTBOX
   ========================================================================== */

const Lightbox = {
  el: null,
  imgEl: null,
  captionEl: null,
  images: [],
  currentIdx: 0,

  init() {
    // Create lightbox DOM if not in HTML
    if (!$('.lightbox')) {
      this.create();
    }

    this.el = $('.lightbox');
    this.imgEl = this.el.querySelector('.lightbox__img');
    this.captionEl = this.el.querySelector('.lightbox__caption');

    // Open on click
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-lightbox]');
      if (!trigger) return;

      e.preventDefault();
      const group = trigger.dataset.lightbox;
      const src   = trigger.dataset.lightboxSrc || trigger.href || trigger.src;
      const caption = trigger.dataset.lightboxCaption || '';

      if (group) {
        this.images = $$(`[data-lightbox="${group}"]`).map((el) => ({
          src: el.dataset.lightboxSrc || el.href || el.src || el.querySelector('img')?.src,
          caption: el.dataset.lightboxCaption || '',
        }));
        this.currentIdx = this.images.findIndex(
          (img) => img.src === (trigger.dataset.lightboxSrc || trigger.href)
        );
      } else {
        this.images = [{ src, caption }];
        this.currentIdx = 0;
      }

      this.open();
    });

    // Close
    this.el.querySelector('.lightbox__close')?.addEventListener('click', () => this.close());
    this.el.querySelector('.lightbox__prev')?.addEventListener('click', () => this.prev());
    this.el.querySelector('.lightbox__next')?.addEventListener('click', () => this.next());

    // Click outside content to close
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.el.classList.contains('is-open')) return;
      if (e.key === 'Escape')     this.close();
      if (e.key === 'ArrowLeft')  this.prev();
      if (e.key === 'ArrowRight') this.next();
    });
  },

  create() {
    const tpl = document.createElement('div');
    tpl.className = 'lightbox';
    tpl.setAttribute('role', 'dialog');
    tpl.setAttribute('aria-modal', 'true');
    tpl.setAttribute('aria-label', 'Image viewer');
    tpl.innerHTML = `
      <button class="lightbox__close" aria-label="Close"><i class="bi bi-x-lg"></i></button>
      <button class="lightbox__nav lightbox__prev" aria-label="Previous"><i class="bi bi-chevron-left"></i></button>
      <div class="lightbox__content">
        <img class="lightbox__img" src="" alt="Lightbox image">
        <p class="lightbox__caption"></p>
      </div>
      <button class="lightbox__nav lightbox__next" aria-label="Next"><i class="bi bi-chevron-right"></i></button>
    `;
    document.body.appendChild(tpl);
  },

  open() {
    this.show();
    this.el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    this.updateNav();
  },

  close() {
    this.el.classList.remove('is-open');
    document.body.style.overflow = '';
    // Clear src after transition
    setTimeout(() => {
      if (this.imgEl) this.imgEl.src = '';
    }, 300);
  },

  show() {
    const img = this.images[this.currentIdx];
    if (!img) return;
    if (this.imgEl) {
      this.imgEl.src = img.src;
      this.imgEl.alt = img.caption || 'Gallery image';
    }
    if (this.captionEl) this.captionEl.textContent = img.caption || '';
  },

  prev() {
    if (this.images.length <= 1) return;
    this.currentIdx = (this.currentIdx - 1 + this.images.length) % this.images.length;
    this.show();
  },

  next() {
    if (this.images.length <= 1) return;
    this.currentIdx = (this.currentIdx + 1) % this.images.length;
    this.show();
  },

  updateNav() {
    const prevBtn = this.el.querySelector('.lightbox__prev');
    const nextBtn = this.el.querySelector('.lightbox__next');
    const show = this.images.length > 1;
    if (prevBtn) prevBtn.style.display = show ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = show ? 'flex' : 'none';
  },
};

/* ==========================================================================
   15. TOAST NOTIFICATION SYSTEM
   ========================================================================== */

const Toast = {
  container: null,
  defaultDuration: 4000,

  init() {
    if (!$('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(this.container);
    } else {
      this.container = $('.toast-container');
    }
  },

  show({ title = '', message = '', type = 'info', duration = this.defaultDuration, icon = null } = {}) {
    const icons = { success: '<i class="bi bi-check-lg"></i>', error: '<i class="bi bi-x-lg"></i>', warning: '<i class="bi bi-exclamation-triangle"></i>', info: '<i class="bi bi-info-circle"></i>' };
    const toastIcon = icon || icons[type] || icons.info;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.style.position = 'relative';
    toast.innerHTML = `
      <div class="toast__icon">${toastIcon}</div>
      <div class="toast__body">
        ${title ? `<div class="toast__title">${title}</div>` : ''}
        ${message ? `<div class="toast__message">${message}</div>` : ''}
      </div>
      <button class="toast__close" aria-label="Dismiss notification"><i class="bi bi-x-lg"></i></button>
      <div class="toast__progress" style="animation-duration: ${duration}ms;"></div>
    `;

    this.container.appendChild(toast);

    // Close button
    toast.querySelector('.toast__close').addEventListener('click', () => this.dismiss(toast));

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('is-visible'));
    });

    // Auto dismiss
    const timer = setTimeout(() => this.dismiss(toast), duration);
    toast._timer = timer;

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      clearTimeout(toast._timer);
      const prog = toast.querySelector('.toast__progress');
      if (prog) prog.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
      toast._timer = setTimeout(() => this.dismiss(toast), duration / 2);
      const prog = toast.querySelector('.toast__progress');
      if (prog) prog.style.animationPlayState = 'running';
    });

    return toast;
  },

  dismiss(toast) {
    clearTimeout(toast._timer);
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 400);
  },

  success(title, message, opts = {}) {
    return this.show({ title, message, type: 'success', icon: '<i class="bi bi-check-lg"></i>', ...opts });
  },

  error(title, message, opts = {}) {
    return this.show({ title, message, type: 'error', icon: '<i class="bi bi-x-lg"></i>', ...opts });
  },

  warning(title, message, opts = {}) {
    return this.show({ title, message, type: 'warning', icon: '<i class="bi bi-exclamation-triangle"></i>', ...opts });
  },

  info(title, message, opts = {}) {
    return this.show({ title, message, type: 'info', icon: '<i class="bi bi-info-circle"></i>', ...opts });
  },
};

/* ==========================================================================
   16. CHART.JS INITIALIZATION HELPERS (Dashboard)
   ========================================================================== */

const ChartHelpers = {
  defaults: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          font: { family: "'DM Sans', sans-serif", size: 12 },
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: '#292D32',
        titleFont: { family: "'DM Sans', sans-serif", size: 13, weight: '600' },
        bodyFont: { family: "'DM Sans', sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
      },
    },
  },

  colors: {
    blue:      '#4A7090',
    sage:      '#A8B9A5',
    champagne: '#D8C5A5',
    charcoal:  '#292D32',
    success:   '#4CAF7D',
    warning:   '#F5A623',
    error:     '#E74C3C',
  },

  blueGradient(ctx, opacity = 0.2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, `rgba(84,124,155,${opacity})`);
    gradient.addColorStop(1, `rgba(84,124,155,0)`);
    return gradient;
  },

  sageGradient(ctx, opacity = 0.2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, `rgba(168,185,165,${opacity})`);
    gradient.addColorStop(1, `rgba(168,185,165,0)`);
    return gradient;
  },

  /**
   * Create a line chart
   * @param {string|HTMLElement} canvas - Canvas selector or element
   * @param {Object} data - Chart.js data config
   * @param {Object} options - Chart.js options override
   */
  createLineChart(canvas, data, options = {}) {
    if (typeof window.Chart === 'undefined') return null;

    const el = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
    if (!el) return null;

    const ctx = el.getContext('2d');

    // Apply gradient fills to datasets
    if (data.datasets) {
      data.datasets.forEach((ds, i) => {
        if (ds.fill) {
          ds.backgroundColor = i === 0 ? this.blueGradient(ctx) : this.sageGradient(ctx);
        }
      });
    }

    return new window.Chart(ctx, {
      type: 'line',
      data,
      options: deepMerge({
        ...this.defaults,
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: '#9CA3AF' },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: '#9CA3AF' },
          },
        },
        elements: {
          line:  { tension: 0.4, borderWidth: 2 },
          point: { radius: 4, hoverRadius: 6, borderWidth: 2, backgroundColor: '#fff' },
        },
      }, options),
    });
  },

  /**
   * Create a bar chart
   */
  createBarChart(canvas, data, options = {}) {
    if (typeof window.Chart === 'undefined') return null;

    const el = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
    if (!el) return null;

    return new window.Chart(el.getContext('2d'), {
      type: 'bar',
      data,
      options: deepMerge({
        ...this.defaults,
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: '#9CA3AF' },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: '#9CA3AF' },
          },
        },
        elements: { bar: { borderRadius: 6, borderWidth: 0 } },
      }, options),
    });
  },

  /**
   * Create a doughnut chart
   */
  createDoughnutChart(canvas, data, options = {}) {
    if (typeof window.Chart === 'undefined') return null;

    const el = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
    if (!el) return null;

    return new window.Chart(el.getContext('2d'), {
      type: 'doughnut',
      data,
      options: deepMerge({
        ...this.defaults,
        cutout: '70%',
        plugins: {
          ...this.defaults.plugins,
          legend: { ...this.defaults.plugins.legend, position: 'bottom' },
        },
      }, options),
    });
  },

  /**
   * Update chart theme colors when dark mode changes
   */
  updateTheme(isDark) {
    if (typeof window.Chart === 'undefined') return;

    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    const tickColor = isDark ? '#6B7280' : '#9CA3AF';
    const tooltipBg = isDark ? '#1a1d21' : '#292D32';

    window.Chart.defaults.color = tickColor;
    window.Chart.defaults.borderColor = gridColor;

    // Update existing charts
    Object.values(window.Chart.instances || {}).forEach((chart) => {
      if (chart.options.plugins?.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = tooltipBg;
      }
      chart.update('none');
    });
  },
};

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/* ==========================================================================
   17. DASHBOARD SIDEBAR TOGGLE
   ========================================================================== */

const SidebarManager = {
  sidebar: null,
  mainContent: null,
  isCollapsed: false,
  storageKey: 'dc-sidebar-collapsed',

  init() {
    this.sidebar     = $('.sidebar');
    this.mainContent = $('.dashboard-main');
    if (!this.sidebar) return;

    this.isCollapsed = getPreference(this.storageKey) === 'true';
    if (this.isCollapsed) this.applyCollapsed(false);

    // Collapse button
    const btn = this.sidebar.querySelector('.sidebar__collapse-btn') ||
                $('[data-sidebar-toggle]');
    if (btn) btn.addEventListener('click', () => this.toggle());

    // Mobile: open/close via overlay
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-sidebar-open]');
      if (trigger && window.innerWidth < 768) {
        this.sidebar.classList.add('is-open');
        this.ensureOverlay().classList.add('is-visible');
      }

      const overlay = e.target.closest('.nav-overlay');
      if (overlay && window.innerWidth < 768) {
        this.sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
      }
    });
  },

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.applyCollapsed(true);
    savePreference(this.storageKey, String(this.isCollapsed));
  },

  applyCollapsed(animate = true) {
    if (!animate) this.sidebar.style.transition = 'none';

    this.sidebar.classList.toggle('sidebar--collapsed', this.isCollapsed);
    if (this.mainContent) {
      this.mainContent.classList.toggle('dashboard-main--expanded', this.isCollapsed);
    }

    if (!animate) {
      requestAnimationFrame(() => {
        this.sidebar.style.transition = '';
      });
    }
  },

  ensureOverlay() {
    let overlay = $('.nav-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'nav-overlay';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
    return overlay;
  },
};

/* ==========================================================================
   18. PROGRESS BAR ANIMATION
   ========================================================================== */

const ProgressBars = {
  observer: null,

  init() {
    if (!('IntersectionObserver' in window)) {
      $$('[data-progress]').forEach((el) => {
        el.style.width = el.dataset.progress + '%';
      });
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.width = entry.target.dataset.progress + '%';
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    $$('[data-progress]').forEach((bar) => {
      bar.style.width = '0%';
      bar.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
      this.observer.observe(bar);
    });
  },
};

/* ==========================================================================
   19. BEFORE / AFTER SLIDER
   ========================================================================== */

const BeforeAfterSlider = {
  init() {
    $$('.before-after').forEach((slider) => this.setup(slider));
  },

  setup(slider) {
    const divider = slider.querySelector('.before-after__divider');
    const before  = slider.querySelector('.before-after__before');
    if (!divider || !before) return;

    let isDragging = false;

    const updatePosition = (x) => {
      const rect  = slider.getBoundingClientRect();
      const relX  = Math.max(0, Math.min(x - rect.left, rect.width));
      const pct   = (relX / rect.width) * 100;
      divider.style.left = pct + '%';
      before.style.width = pct + '%';
    };

    divider.addEventListener('mousedown',  () => { isDragging = true; });
    divider.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) updatePosition(e.clientX);
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) updatePosition(e.touches[0].clientX);
    }, { passive: true });

    document.addEventListener('mouseup',  () => { isDragging = false; });
    document.addEventListener('touchend', () => { isDragging = false; });
  },
};

/* ==========================================================================
   20. MISCELLANEOUS UI HELPERS
   ========================================================================== */

const UIHelpers = {
  init() {
    this.externalLinks();
    this.copyToClipboard();
    this.tooltips();
    this.tabPanels();
    this.dismissibleAlerts();
    this.stickyTopOffset();
  },

  /**
   * Open external links in a new tab safely
   */
  externalLinks() {
    $$('a[href^="http"]').forEach((link) => {
      if (!link.hostname || link.hostname !== window.location.hostname) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  },

  /**
   * Copy text to clipboard buttons
   */
  copyToClipboard() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;

      const text = btn.dataset.copy || btn.previousElementSibling?.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 2000);
      } catch {
        Toast.error('Copy failed', 'Could not copy to clipboard.');
      }
    });
  },

  /**
   * Simple title-attribute tooltip enhancement
   */
  tooltips() {
    $$('[data-tooltip]').forEach((el) => {
      const text = el.dataset.tooltip;
      if (!text) return;

      let tip;

      el.addEventListener('mouseenter', (e) => {
        tip = document.createElement('div');
        tip.className = 'tooltip';
        tip.textContent = text;
        tip.style.cssText = `
          position: fixed;
          background: var(--color-charcoal);
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-family: var(--font-body);
          white-space: nowrap;
          pointer-events: none;
          z-index: 600;
          opacity: 0;
          transition: opacity 0.15s ease;
        `;
        document.body.appendChild(tip);

        const rect = el.getBoundingClientRect();
        tip.style.top  = (rect.top - tip.offsetHeight - 8) + 'px';
        tip.style.left = (rect.left + rect.width / 2 - tip.offsetWidth / 2) + 'px';

        requestAnimationFrame(() => { tip.style.opacity = '1'; });
      });

      el.addEventListener('mouseleave', () => {
        if (tip) {
          tip.style.opacity = '0';
          setTimeout(() => tip?.remove(), 150);
        }
      });
    });
  },

  /**
   * Tab panel switching
   */
  tabPanels() {
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (!tab) return;

      const container = tab.closest('[data-tabs]');
      if (!container) return;

      const targetId = tab.dataset.tab;

      $$('[data-tab]', container).forEach((t) => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });

      $$('[data-tab-panel]', container).forEach((panel) => {
        const show = panel.dataset.tabPanel === targetId;
        panel.classList.toggle('is-active', show);
        panel.style.display = show ? 'block' : 'none';
      });
    });

    // Initialize: show first panel only
    $$('[data-tabs]').forEach((container) => {
      const panels = $$('[data-tab-panel]', container);
      panels.forEach((panel, i) => {
        panel.style.display = i === 0 ? 'block' : 'none';
      });
    });
  },

  /**
   * Dismissible alerts / banners
   */
  dismissibleAlerts() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dismiss]');
      if (!btn) return;

      const target = btn.closest(btn.dataset.dismiss || '[data-dismissible]');
      if (!target) return;

      target.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      target.style.opacity = '0';
      target.style.transform = 'translateY(-8px)';
      setTimeout(() => target.remove(), 300);
    });
  },

  /**
   * Keep sticky elements below the navbar height
   */
  stickyTopOffset() {
    const navbar = $('.navbar');
    if (!navbar) return;

    const updateOffset = () => {
      const h = navbar.offsetHeight;
      $$('[data-sticky-below-nav]').forEach((el) => {
        el.style.top = h + 'px';
      });
    };

    updateOffset();
    window.addEventListener('resize', debounce(updateOffset, 200));
  },
};

/* ==========================================================================
   21. PAGE TRANSITION LOADER
   ========================================================================== */

const PageLoader = {
  bar: null,

  init() {
    // Create thin top-bar loader
    this.bar = document.createElement('div');
    this.bar.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #4A7090, #A8B9A5);
      transform-origin: left;
      transform: scaleX(0);
      z-index: 9999;
      transition: transform 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(this.bar);

    // Show on page unload
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.href;
      if (!href || href.startsWith('#') || href.startsWith('javascript') ||
          link.target === '_blank' || link.download) return;

      if (new URL(href, location.href).origin === location.origin) {
        this.show();
      }
    });

    // Hide when page is loaded
    window.addEventListener('load', () => this.hide());
  },

  show() {
    this.bar.style.transform = 'scaleX(0.7)';
  },

  hide() {
    this.bar.style.transform = 'scaleX(1)';
    setTimeout(() => {
      this.bar.style.opacity = '0';
      this.bar.style.transform = 'scaleX(0)';
      setTimeout(() => { this.bar.style.opacity = '1'; }, 300);
    }, 200);
  },
};

/* ==========================================================================
   22. BACK TO TOP BUTTON
   ========================================================================== */

const BackToTop = {
  btn: null,

  init() {
    this.btn = $('[data-back-to-top]') || this.create();

    window.addEventListener('scroll', throttle(() => {
      const show = window.scrollY > 400;
      this.btn.style.opacity   = show ? '1' : '0';
      this.btn.style.transform = show ? 'translateY(0)' : 'translateY(20px)';
      this.btn.style.pointerEvents = show ? 'auto' : 'none';
    }, 100), { passive: true });

    this.btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  create() {
    const btn = document.createElement('button');
    btn.className = 'btn btn--primary btn--icon';
    btn.setAttribute('data-back-to-top', '');
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    btn.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 400;
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      width: 44px;
      height: 44px;
      font-size: 1.1rem;
      box-shadow: 0 4px 16px rgba(84,124,155,0.35);
    `;
    document.body.appendChild(btn);
    return btn;
  },
};

/* ==========================================================================
   23. GLOBAL EVENT BUS
   ========================================================================== */

const EventBus = {
  _listeners: {},

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((cb) => cb !== callback);
  },

  emit(event, data) {
    (this._listeners[event] || []).forEach((cb) => cb(data));
  },
};

/* ==========================================================================
   24. INITIALIZATION
   ========================================================================== */

function initDermaClinic() {
  // Core
  ThemeManager.init();
  RTLManager.init();
  NavbarManager.init();
  MobileNavManager.init();
  ActiveNav.init();
  SmoothScroll.init();
  ScrollReveal.init();

  // Components
  Accordion.init();
  FilterTabs.init();
  BookingUI.init();
  CounterAnimation.init();
  ProgressBars.init();
  Lightbox.init();
  BeforeAfterSlider.init();

  // Notifications & UI
  Toast.init();
  UIHelpers.init();
  SidebarManager.init();
  BackToTop.init();
  PageLoader.init();

  // Form validation
  FormValidator.init();

  // Sync chart theme on dark mode changes
  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.attributeName === 'data-theme') {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ChartHelpers.updateTheme(isDark);
        EventBus.emit('theme:changed', { theme: isDark ? 'dark' : 'light' });
      }
    });
  });
  themeObserver.observe(document.documentElement, { attributes: true });

  // Initialize mini calendars
  $$('[data-mini-calendar]').forEach((cal) => BookingUI.buildCalendar(cal));

  // Expose globals for inline scripts / other pages
  window.DermaClinic = {
    ThemeManager,
    RTLManager,
    Toast,
    ChartHelpers,
    BookingUI,
    EventBus,
    ScrollReveal,
    FormValidator,
  };

  console.log('%cDermaClinic UI Initialized', 'color:#4A7090;font-weight:bold;font-size:14px;');
}

/* ==========================================================================
   25. DOM READY
   ========================================================================== */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDermaClinic);
} else {
  initDermaClinic();
}

/* ==========================================================================
   END OF MAIN.JS
   ========================================================================== */
