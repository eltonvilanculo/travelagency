"use client";
import { useEffect, useRef } from "react";

/**
 * Site-wide scroll motion, mounted once in the public Shell:
 *  - a thin brand-yellow reading-progress bar under the top edge
 *  - fade/slide-up reveal for every page section (a <section>, or a padded
 *    block directly under <main>) below the fold, with grid
 *    children staggered
 *
 * Reveal state lives in a data-reveal attribute (React re-renders reset className, not unknown attributes) and is only added from JS, so with JS off (or reduced motion
 * on) all content is simply visible. Elements already on screen reveal
 * on the observer's first callback.
 */
export function ScrollEffects() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!bar) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      bar.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    if (!reduced) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.setAttribute("data-reveal", "in");
            io?.unobserve(e.target);
          }
        },
        { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
      );

      const seen = new WeakSet<Element>();
      const register = (el: HTMLElement, delay: number) => {
        if (seen.has(el)) return;
        seen.add(el);
        // AnimateIn already animates these (transition-all duration-700).
        if (el.classList.contains("duration-700")) return;
        el.setAttribute("data-reveal", "out");
        el.style.setProperty("--reveal-delay", `${delay}ms`);
        io?.observe(el);
      };

      const scan = () => {
        document.querySelectorAll<HTMLElement>(
          'main section, main > div[class*="py-"], main > div > div[class*="py-"]'
        ).forEach((section) => {
          Array.from(section.children).forEach((child) => {
            if (!(child instanceof HTMLElement)) return;
            if (/(^|\s)grid(\s|$)/.test(child.className)) {
              Array.from(child.children).forEach((item, i) => {
                if (item instanceof HTMLElement) register(item, Math.min(i, 8) * 80);
              });
            } else {
              register(child, 0);
            }
          });
        });
      };

      scan();
      // Suspense sections stream in after hydration.
      const main = document.querySelector("main");
      if (main) {
        mo = new MutationObserver(() => scan());
        mo.observe(main, { childList: true, subtree: true });
      }
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      io?.disconnect();
      mo?.disconnect();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        ref={barRef}
        className="h-full origin-left scale-x-0 bg-orange"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
