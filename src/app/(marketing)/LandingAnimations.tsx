'use client';

import { useEffect } from 'react';

export function LandingAnimations() {
  useEffect(() => {
    const nav = document.querySelector('[data-nav]');

    const onScroll = () => {
      if (nav) {
        nav.classList.toggle('scrolled', window.scrollY > 40);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('in-view');
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.appear').forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return null;
}
