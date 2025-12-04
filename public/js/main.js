/**
 * Latour's HVAC - Main JavaScript
 * Core 30 SEO Optimized Website
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mobile Menu Toggle
  initMobileMenu();

  // FAQ Accordion
  initFaqAccordion();

  // Smooth Scroll
  initSmoothScroll();

  // Header Scroll Effect
  initHeaderScroll();

  // Dropdown Navigation
  initDropdownNav();

  // Form Validation
  initFormValidation();

  // Lazy Loading Images
  initLazyLoading();

  // Animation on Scroll
  initScrollAnimations();
});

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const nav = document.querySelector('.nav-main');
  const menuItems = document.querySelectorAll('.nav-menu > li');

  if (toggle && nav) {
    toggle.addEventListener('click', function() {
      nav.classList.toggle('active');
      toggle.classList.toggle('active');

      // Animate hamburger to X
      const spans = toggle.querySelectorAll('span');
      if (toggle.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      }
    });

    // Mobile dropdown toggle
    menuItems.forEach(item => {
      const link = item.querySelector('a');
      const dropdown = item.querySelector('.nav-dropdown');

      if (dropdown && window.innerWidth <= 768) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          item.classList.toggle('active');
        });
      }
    });
  }
}

/**
 * FAQ Accordion
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    if (question) {
      question.addEventListener('click', function() {
        // Close other open items
        faqItems.forEach(otherItem => {
          if (otherItem !== item && otherItem.classList.contains('active')) {
            otherItem.classList.remove('active');
          }
        });

        // Toggle current item
        item.classList.toggle('active');
      });
    }
  });
}

/**
 * Smooth Scroll for Anchor Links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');

      if (targetId !== '#') {
        e.preventDefault();
        const target = document.querySelector(targetId);

        if (target) {
          const headerOffset = 100;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });
}

/**
 * Header Scroll Effect
 */
function initHeaderScroll() {
  const header = document.querySelector('.header-main');
  let lastScroll = 0;

  if (header) {
    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset;

      if (currentScroll > 100) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      // Hide/show header on scroll
      if (currentScroll > lastScroll && currentScroll > 200) {
        header.style.transform = 'translateY(-100%)';
      } else {
        header.style.transform = 'translateY(0)';
      }

      lastScroll = currentScroll;
    });
  }
}

/**
 * Dropdown Navigation (Desktop)
 */
function initDropdownNav() {
  const dropdownItems = document.querySelectorAll('.nav-menu > li');

  dropdownItems.forEach(item => {
    const dropdown = item.querySelector('.nav-dropdown');

    if (dropdown && window.innerWidth > 768) {
      item.addEventListener('mouseenter', function() {
        dropdown.style.display = 'block';
        setTimeout(() => {
          dropdown.style.opacity = '1';
          dropdown.style.transform = 'translateY(0)';
        }, 10);
      });

      item.addEventListener('mouseleave', function() {
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(10px)';
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 300);
      });
    }
  });
}

/**
 * Form Validation
 */
function initFormValidation() {
  const forms = document.querySelectorAll('form[data-validate]');

  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      let isValid = true;
      const requiredFields = form.querySelectorAll('[required]');

      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error');
          showFieldError(field, 'This field is required');
        } else {
          field.classList.remove('error');
          hideFieldError(field);
        }

        // Email validation
        if (field.type === 'email' && field.value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(field.value)) {
            isValid = false;
            field.classList.add('error');
            showFieldError(field, 'Please enter a valid email address');
          }
        }

        // Phone validation
        if (field.type === 'tel' && field.value) {
          const phoneRegex = /^[\d\s\-\(\)]+$/;
          if (!phoneRegex.test(field.value) || field.value.replace(/\D/g, '').length < 10) {
            isValid = false;
            field.classList.add('error');
            showFieldError(field, 'Please enter a valid phone number');
          }
        }
      });

      if (!isValid) {
        e.preventDefault();
      }
    });
  });
}

function showFieldError(field, message) {
  let errorEl = field.parentNode.querySelector('.field-error');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    errorEl.style.color = '#d94a4a';
    errorEl.style.fontSize = '0.875rem';
    errorEl.style.marginTop = '0.25rem';
    errorEl.style.display = 'block';
    field.parentNode.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

function hideFieldError(field) {
  const errorEl = field.parentNode.querySelector('.field-error');
  if (errorEl) {
    errorEl.remove();
  }
}

/**
 * Lazy Loading Images
 */
function initLazyLoading() {
  const lazyImages = document.querySelectorAll('img[data-src]');

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for older browsers
    lazyImages.forEach(img => {
      img.src = img.dataset.src;
    });
  }
}

/**
 * Animation on Scroll
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('[data-animate]');

  if ('IntersectionObserver' in window) {
    const animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const animationType = entry.target.dataset.animate;
          entry.target.classList.add(`animate-${animationType}`);
          animationObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => animationObserver.observe(el));
  }
}

/**
 * Phone Number Click Tracking
 */
function trackPhoneClick(phoneNumber) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'click', {
      'event_category': 'Contact',
      'event_label': 'Phone Call',
      'value': phoneNumber
    });
  }
}

/**
 * Service Area Locator
 */
function checkServiceArea(zipCode) {
  const serviceZips = [
    '70601', '70602', '70605', '70607', '70609', // Lake Charles
    '70663', '70664', '70665', // Sulphur
    '70669', // Westlake
    '70647', // Iowa
    '70648', // Kinder
    '70657', // Ragley
    '70634', // DeRidder
    '70633', // DeQuincy
  ];

  return serviceZips.includes(zipCode);
}

/**
 * Utility: Debounce Function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Utility: Format Phone Number
 */
function formatPhoneNumber(phoneNumber) {
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phoneNumber;
}

/**
 * Initialize Google Maps Embed (if present)
 */
function initMap() {
  const mapContainers = document.querySelectorAll('.map-container');
  // Maps are embedded via iframe, no additional initialization needed
}

// Export functions for use in other scripts
window.LatourHVAC = {
  trackPhoneClick,
  checkServiceArea,
  formatPhoneNumber
};
