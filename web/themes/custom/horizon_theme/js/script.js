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

  // Share This toggle: click opens/closes the dropdown of platform icons;
  // clicking outside or pressing Escape closes it again.
  Drupal.behaviors.horizonShareToggle = {
    attach: function (context) {
      once('horizon-share-toggle', '.js-share-toggle', context).forEach(function (toggle) {
        var panel = toggle.closest('.sharethis-toggle-wrap').querySelector('.js-share-panel');
        if (!panel) {
          return;
        }
        toggle.addEventListener('click', function (event) {
          event.stopPropagation();
          var expanded = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!expanded));
          panel.classList.toggle('is-open', !expanded);
        });
        document.addEventListener('click', function (event) {
          if (!toggle.contains(event.target) && !panel.contains(event.target)) {
            toggle.setAttribute('aria-expanded', 'false');
            panel.classList.remove('is-open');
          }
        });
        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') {
            toggle.setAttribute('aria-expanded', 'false');
            panel.classList.remove('is-open');
          }
        });
      });
    }
  };

  // Content Hub Featured carousel (tablet/mobile): prev/next arrows just
  // scroll the track by one item's width — the browser's own scroll-snap
  // handles settling on the next card.
  Drupal.behaviors.horizonFeaturedCarousel = {
    attach: function (context) {
      once('horizon-featured-carousel', '.js-featured-track', context).forEach(function (track) {
        var wrap = track.closest('.content-hub-featured_mobile');
        var prev = wrap.querySelector('.js-featured-prev');
        var next = wrap.querySelector('.js-featured-next');
        var item = track.querySelector('.content-hub-featured_mobile_item');
        if (!prev || !next || !item) {
          return;
        }
        var scrollByOne = function (direction) {
          var amount = (item.getBoundingClientRect().width + 16) * direction;
          track.scrollBy({ left: amount, behavior: 'smooth' });
        };
        prev.addEventListener('click', function () { scrollByOne(-1); });
        next.addEventListener('click', function () { scrollByOne(1); });
      });
    }
  };

  // Content Hub Trending carousel: same idea as the Featured carousel,
  // but there are two arrow pairs (one pinned left on desktop, one below
  // on mobile/tablet — only one pair is visible at a time via CSS) that
  // both need to drive the same track.
  Drupal.behaviors.horizonTrendingCarousel = {
    attach: function (context) {
      once('horizon-trending-carousel', '.js-trending-track', context).forEach(function (track) {
        var carousel = track.closest('.content-hub-trending_carousel');
        var originalItems = Array.prototype.slice.call(track.querySelectorAll('.content-hub-trending_item'));
        if (!carousel || !originalItems.length) {
          return;
        }

        // Seamless infinite loop: clone the whole card set once before and
        // once after the real cards, so the track never has to jump
        // backward to card 1 — every click just keeps moving the same
        // direction, forever. When the (identical, aria-hidden) clone set
        // scrolls into view, the position is silently re-centered back
        // into the real set by exactly one set's width; since the clone
        // is pixel-identical to the real cards, that jump is invisible.
        var cloneSet = function (before) {
          var order = before ? originalItems.slice().reverse() : originalItems;
          order.forEach(function (el) {
            var clone = el.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.querySelectorAll('a, button').forEach(function (focusable) {
              focusable.tabIndex = -1;
            });
            track.insertBefore(clone, before ? track.firstChild : null);
          });
        };
        cloneSet(true);
        cloneSet(false);

        var step = originalItems[0].getBoundingClientRect().width + 16;
        var setWidth = originalItems.length * step;
        track.scrollTo({ left: setWidth, behavior: 'instant' });

        var isAnimating = false;
        var recenter = function () {
          // Landed in the trailing clone (scrolled past the real set) or
          // the leading clone (scrolled before it) — jump back by one set
          // width with no animation ('instant' overrides the CSS
          // scroll-behavior some tracks set), landing on the pixel-
          // identical spot in the real set.
          if (track.scrollLeft >= setWidth * 2) {
            track.scrollTo({ left: track.scrollLeft - setWidth, behavior: 'instant' });
          }
          else if (track.scrollLeft < setWidth) {
            track.scrollTo({ left: track.scrollLeft + setWidth, behavior: 'instant' });
          }
        };

        var scrollByOne = function (direction) {
          // Rapid repeat clicks used to race the in-flight smooth-scroll
          // animation: reading track.scrollLeft mid-transition gave a
          // stale value. Lock clicks out until the current scroll (and
          // the recenter check after it) settles, so every click sees a
          // true state.
          if (isAnimating) {
            return;
          }
          isAnimating = true;
          track.scrollTo({ left: track.scrollLeft + step * direction, behavior: 'smooth' });
          window.setTimeout(function () {
            recenter();
            isAnimating = false;
          }, 500);
        };
        carousel.querySelectorAll('.js-trending-prev').forEach(function (btn) {
          btn.addEventListener('click', function () { scrollByOne(-1); });
        });
        carousel.querySelectorAll('.js-trending-next').forEach(function (btn) {
          btn.addEventListener('click', function () { scrollByOne(1); });
        });
      });
    }
  };

  Drupal.behaviors.horizonSocialHighlights = {
    attach: function (context) {
      once('horizon-social-highlights', '.social-highlights_track', context).forEach(function (track) {
        var carousel = track.closest('.social-highlights_carousel');
        var originalSlides = Array.prototype.slice.call(track.querySelectorAll('.social-highlights_slide'));
        var dotsWrap = carousel.querySelector('.social-highlights_dots');
        var prevBtn = carousel.querySelector('.social-highlights_arrow--prev');
        var nextBtn = carousel.querySelector('.social-highlights_arrow--next');
        if (!originalSlides.length) {
          return;
        }

        // Seamless infinite loop: clone the whole slide set once before
        // and once after the real slides — same technique as the Content
        // Hub Trending carousel (horizonTrendingCarousel above). Every
        // click keeps moving the same direction forever; landing in a
        // (identical, aria-hidden) clone set silently re-centers back
        // into the real set by one set's width, invisibly.
        var cloneSet = function (before) {
          var order = before ? originalSlides.slice().reverse() : originalSlides;
          order.forEach(function (el) {
            var clone = el.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.querySelectorAll('a, button').forEach(function (focusable) {
              focusable.tabIndex = -1;
            });
            track.insertBefore(clone, before ? track.firstChild : null);
          });
        };
        cloneSet(true);
        cloneSet(false);

        // Slide width (and so setWidth) isn't fixed — .social-highlights_slide
        // is narrower below 768px (see social-highlights.css) — so it's
        // read live, not cached, and re-checked on resize.
        var slideWidth = function () {
          return originalSlides[0].getBoundingClientRect().width + 20;
        };
        var setWidth = function () {
          return originalSlides.length * slideWidth();
        };

        track.scrollTo({ left: setWidth(), behavior: 'instant' });

        var dots = [];

        var buildDots = function () {
          dotsWrap.innerHTML = '';
          dots = [];
          var count = originalSlides.length;
          for (var i = 0; i < count; i++) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'dot';
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            (function (index) {
              dot.addEventListener('click', function () {
                track.scrollTo({ left: setWidth() + index * slideWidth(), behavior: 'smooth' });
              });
            })(i);
            dotsWrap.appendChild(dot);
            dots.push(dot);
          }
          updateActiveDot();
        };

        var updateActiveDot = function () {
          var count = originalSlides.length;
          var relative = track.scrollLeft - setWidth();
          var index = Math.round(relative / slideWidth());
          index = ((index % count) + count) % count;
          dots.forEach(function (dot, i) {
            dot.classList.toggle('is-active', i === index);
          });
          // Arrows never disable at the ends — this carousel loops
          // infinitely, so there is no dead end for "prev"/"next" to reach.
        };

        var isAnimating = false;
        var recenter = function () {
          // Landed in the trailing clone or the leading clone — jump back
          // by one set width with no animation ('instant' overrides the
          // CSS scroll-behavior:smooth this track sets), landing on the
          // pixel-identical spot in the real set.
          if (track.scrollLeft >= setWidth() * 2) {
            track.scrollTo({ left: track.scrollLeft - setWidth(), behavior: 'instant' });
          }
          else if (track.scrollLeft < setWidth()) {
            track.scrollTo({ left: track.scrollLeft + setWidth(), behavior: 'instant' });
          }
        };

        var scrollByOne = function (direction) {
          if (isAnimating) {
            return;
          }
          isAnimating = true;
          track.scrollTo({ left: track.scrollLeft + slideWidth() * direction, behavior: 'smooth' });
          window.setTimeout(function () {
            recenter();
            updateActiveDot();
            isAnimating = false;
          }, 500);
        };

        if (prevBtn) {
          prevBtn.addEventListener('click', function () { scrollByOne(-1); });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', function () { scrollByOne(1); });
        }
        track.addEventListener('scroll', function () {
          window.requestAnimationFrame(updateActiveDot);
        });
        window.addEventListener('resize', function () {
          // Slide width changes across the 768px breakpoint, which moves
          // setWidth() too — re-anchor to the start of the real (middle)
          // set under the new layout instead of leaving scrollLeft
          // pointing at a now-wrong pixel offset.
          track.scrollTo({ left: setWidth(), behavior: 'instant' });
          buildDots();
        });

        buildDots();

        // Play/pause toggle for video slides — videos autoplay by default
        // (data-state="playing"); the button lets the viewer pause/resume
        // without navigating the slide's link.
        track.querySelectorAll('.js-social-play-toggle').forEach(function (toggle) {
          var video = toggle.closest('.social-highlights_slide').querySelector('.js-social-video');
          if (!video) {
            return;
          }
          toggle.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (video.paused) {
              video.play();
              toggle.setAttribute('data-state', 'playing');
              toggle.setAttribute('aria-label', Drupal.t('Pause video'));
            }
            else {
              video.pause();
              toggle.setAttribute('data-state', 'paused');
              toggle.setAttribute('aria-label', Drupal.t('Play video'));
            }
          });
        });
      });
    }
  };

})(Drupal, once);
