"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ShinyText from "./ShinyText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function SplitText({ children }: { children: string }) {
  return (
    <>
      {children.split(" ").map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split("").map((char, ci) => (
            <span key={ci} className="char inline-block">
              {char}
            </span>
          ))}
          {wi < children.split(" ").length - 1 && (
            <span className="char inline-block">&nbsp;</span>
          )}
        </span>
      ))}
    </>
  );
}

const services = [
  { id: 1, title: "Rich Text Editor" },
  { id: 2, title: "Smart Organization" },
  { id: 3, title: "Secure & Private" },
  { id: 4, title: "Available Everywhere" },
];

function ServiceItem({ title, index }: { title: string; index: number }) {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        itemRef.current,
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: itemRef.current,
            start: "top 90%",
            end: "top 70%",
            scrub: 1,
          },
        }
      );
    }, itemRef);

    return () => ctx.revert();
  }, [index]);

  return (
    <div ref={itemRef} className="border-t border-foreground/10">
      <div className="flex items-center justify-center px-6 py-8 sm:px-12 md:py-10 lg:px-24">
        <span className="text-[clamp(1.5rem,4vw,4rem)] font-light tracking-tight">
          <ShinyText
            text={title}
            color="var(--accent-deep)"
            shineColor="var(--accent-hi)"
            speed={4}
            delay={0.3}
            spread={120}
          />
        </span>
      </div>
    </div>
  );
}

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!titleRef.current || !sectionRef.current || !contentRef.current) return;

    ScrollTrigger.normalizeScroll(true);

    const title = titleRef.current;
    const chars = title.querySelectorAll(".char");
    const section = sectionRef.current;
    const content = contentRef.current;

    gsap.fromTo(
      chars,
      { willChange: "transform", transformOrigin: "50% 100%", scaleY: 0 },
      {
        ease: "power3.in",
        opacity: 1,
        scaleY: 1,
        stagger: 0.05,
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=150%",
          scrub: 1.5,
          pin: content,
          pinType: "transform",
          invalidateOnRefresh: true,
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      ScrollTrigger.normalizeScroll(false);
    };
  }, []);

  return (
    <section ref={sectionRef} id="services" className="services relative bg-background overflow-hidden">
      <div ref={contentRef} className="flex min-h-dvh items-center justify-center px-6 sm:px-12 lg:px-24">
        <h2
          ref={titleRef}
          className="text-center text-[clamp(2.5rem,7vw,7rem)] font-medium leading-[1.1] tracking-tight text-foreground max-w-350"
        >
          <SplitText>Your thoughts deserve a better home.</SplitText>
        </h2>
      </div>

      <div id="services-menu" className="w-full pb-24">
        <div className="w-full">
          {services.map((service, index) => (
            <ServiceItem key={service.id} title={service.title} index={index} />
          ))}
          <div className="border-t border-foreground/10" />
        </div>
      </div>
    </section>
  );
}
