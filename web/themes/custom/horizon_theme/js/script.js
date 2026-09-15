/**
 * @file
 * Horizon theme behaviors.
 */
(function (Drupal, once) {
  'use strict';

  // Hamburger toggle: open/close the mobile primary menu overlay.
  Drupal.behaviors.horizonNavToggle = {
    attach: function (context) {
      once('horizon-nav-toggle', '.site-header__nav-toggle', context).forEach(function (toggle) {
        toggle.addEventListener('click', function () {
          var expanded = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!expanded));
          document.getElementById('primary-menu').classList.toggle('is-open', !expanded);
        });
      });
    }
  };

  // Dropdown chevron: expand/collapse a submenu (needed on mobile, where
  // there is no hover state to reveal nested menu items).
  Drupal.behaviors.horizonSubmenuToggle = {
    attach: function (context) {
      once('horizon-submenu-toggle', '.primary-menu__toggle', context).forEach(function (toggle) {
        toggle.addEventListener('click', function () {
          var submenu = toggle.closest('li').querySelector(':scope > .primary-menu__submenu');
          if (!submenu) {
            return;
          }
          var expanded = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!expanded));
          submenu.classList.toggle('is-open', !expanded);
        });
      });
    }
  };

  // Sticky header: add a shrink/shadow state once the page scrolls past it.
  Drupal.behaviors.horizonHeaderScroll = {
    attach: function (context) {
      once('horizon-header-scroll', '.site-header', context).forEach(function (header) {
        var update = function () {
          header.classList.toggle('is-scrolled', window.scrollY > 50);
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
      });
    }
  };

  // Scroll-to-top button: shown once the page scrolls past the hero,
  // clicking it scrolls smoothly back to the top.
  Drupal.behaviors.horizonScrollTop = {
    attach: function (context) {
      once('horizon-scroll-top', '#scroll-top', context).forEach(function (button) {
        var update = function () {
          button.classList.toggle('active', window.scrollY > 100);
        };
        update();
        window.addEventListener('scroll', update, { passive: true });

        button.addEventListener('click', function (event) {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }
  };

  // Scroll-spy: highlight the nav link for whichever section is currently
  // under the sticky header. Menu links are now plain <a> tags (see
  // menu--main.html.twig) precisely so nothing but this controls
  // `.is-active` — Drupal's own active-link logic can't tell `/#about`
  // from `/#team` since both resolve to the same front-page route.
  //
  // Uses a scroll listener that picks "whichever section's box currently
  // spans the line just below the header" rather than an
  // IntersectionObserver threshold/rootMargin band — with sections this
  // tall (some taller than the viewport itself), a fixed-height band can
  // sit fully inside one section's whitespace and miss every section for
  // several hundred pixels of scrolling.
  Drupal.behaviors.horizonScrollSpy = {
    attach: function (context) {
      once('horizon-scroll-spy', 'body', context).forEach(function () {
        var header = document.querySelector('.site-header');
        var sections = Array.prototype.slice.call(document.querySelectorAll('section[id]'));
        var links = Array.prototype.slice.call(document.querySelectorAll('.primary-menu > li > .primary-menu__row > a'));
        if (!sections.length || !links.length) {
          return;
        }

        var setActive = function (id) {
          links.forEach(function (link) {
            var href = link.getAttribute('href') || '';
            var matches = id === 'hero' ? (href === '/' || href === '') : href.endsWith('#' + id);
            link.classList.toggle('is-active', matches);
          });
        };

        var ticking = false;
        var update = function () {
          ticking = false;
          var probeLine = (header ? header.offsetHeight : 0) + 10;

          // Bottom of page: always highlight the last section, even if its
          // content doesn't reach all the way down to the probe line.
          var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
          if (atBottom) {
            setActive(sections[sections.length - 1].id);
            return;
          }

          var current = sections.find(function (section) {
            var rect = section.getBoundingClientRect();
            return rect.top <= probeLine && rect.bottom > probeLine;
          });
          setActive(current ? current.id : 'hero');
        };

        window.addEventListener('scroll', function () {
          if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
          }
        }, { passive: true });

        update();
      });
    }
  };

  // Testimonials carousel: build dot indicators for the scroll-snap track,
  // click a dot to scroll to that slide, and highlight the dot for whichever
  // slide is currently centered in view.
  Drupal.behaviors.horizonTestimonialsCarousel = {
    attach: function (context) {
      once('horizon-testimonials-carousel', '.testimonials-carousel', context).forEach(function (carousel) {
        var track = carousel.querySelector('.testimonials-track');
        var dotsWrap = carousel.querySelector('.testimonials-dots');
        var slides = Array.prototype.slice.call(track.querySelectorAll('.testimonials-track__slide'));
        if (slides.length < 2) {
          return;
        }

        var dots = slides.map(function (slide, index) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.setAttribute('aria-label', Drupal.t('Go to slide @n', { '@n': index + 1 }));
          dot.addEventListener('click', function () {
            slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          });
          dotsWrap.appendChild(dot);
          return dot;
        });

        var setActive = function (activeIndex) {
          dots.forEach(function (dot, index) {
            dot.setAttribute('aria-current', String(index === activeIndex));
          });
        };
        setActive(0);

        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              setActive(slides.indexOf(entry.target));
            }
          });
        }, { root: track, threshold: 0.6 });

        slides.forEach(function (slide) {
          observer.observe(slide);
        });
      });
    }
  };

  // FAQ accordion: <details>/<summary> already gives open/close for free —
  // this only opens the first item by default, matching the reference.
  Drupal.behaviors.horizonFaqDefaultOpen = {
    attach: function (context) {
      once('horizon-faq-default-open', '.faq-list', context).forEach(function (list) {
        var first = list.querySelector('.faq-item');
        if (first) {
          first.open = true;
        }
      });
    }
  };

  // Portfolio filters: build one button per category actually present in
  // the grid (read from each card's data-category attribute, set in
  // node--portfolio-item--teaser.html.twig), then show/hide cards on
  // click. No Isotope.js — just a plain, fully responsive show/hide.
  Drupal.behaviors.horizonPortfolioFilter = {
    attach: function (context) {
      once('horizon-portfolio-filter', '.portfolio-filters', context).forEach(function (filters) {
        var grid = filters.nextElementSibling;
        if (!grid) {
          return;
        }
        var cards = Array.prototype.slice.call(grid.querySelectorAll('.portfolio-card'));
        var categories = [];
        cards.forEach(function (card) {
          var category = card.getAttribute('data-category');
          if (category && categories.indexOf(category) === -1) {
            categories.push(category);
          }
        });

        categories.forEach(function (category) {
          var button = document.createElement('button');
          button.type = 'button';
          button.textContent = category;
          button.dataset.filter = category;
          filters.appendChild(button);
        });

        filters.addEventListener('click', function (event) {
          var button = event.target.closest('button');
          if (!button) {
            return;
          }
          filters.querySelectorAll('button').forEach(function (b) {
            b.classList.toggle('is-active', b === button);
          });
          var filter = button.dataset.filter;
          cards.forEach(function (card) {
            var row = card.closest('.views-row');
            var show = filter === '*' || card.getAttribute('data-category') === filter;
            row.hidden = !show;
          });
        });
      });
    }
  };

  // Portfolio lightbox: clicking the "+" icon shows the full image in an
  // on-page overlay instead of navigating away — a small vanilla
  // replacement for the reference's glightbox library.
  Drupal.behaviors.horizonLightbox = {
    attach: function (context) {
      once('horizon-lightbox', '.js-lightbox', context).forEach(function (trigger) {
        trigger.addEventListener('click', function (event) {
          event.preventDefault();

          var overlay = document.querySelector('.lightbox-overlay');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'lightbox-overlay';
            overlay.innerHTML =
              '<button type="button" class="lightbox-overlay__close" aria-label="' + Drupal.t('Close') + '">&times;</button>' +
              '<img class="lightbox-overlay__image" src="" alt="">';
            document.body.appendChild(overlay);

            overlay.addEventListener('click', function (event) {
              if (event.target === overlay || event.target.closest('.lightbox-overlay__close')) {
                overlay.classList.remove('is-open');
              }
            });
            document.addEventListener('keydown', function (event) {
              if (event.key === 'Escape') {
                overlay.classList.remove('is-open');
              }
            });
          }

          var img = overlay.querySelector('.lightbox-overlay__image');
          img.src = trigger.getAttribute('href');
          img.alt = trigger.dataset.title || '';
          overlay.classList.add('is-open');
        });
      });
    }
  };

})(Drupal, once);
