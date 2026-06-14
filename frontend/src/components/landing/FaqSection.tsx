"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const faqs = [
  {
    question: "Is Dendrite free to use?",
    answer: "Yes — Dendrite is free during beta. After launch we plan to offer a generous free tier with premium features available as an upgrade. Early beta users receive a permanent discount as a thank-you for their early support.",
  },
  {
    question: "What makes Dendrite different from other notes apps?",
    answer: "Dendrite combines a beautiful, distraction-free editor with powerful organization (folders, tags, fast search) and premium design. It is built for people who take their thinking seriously and expect their tools to keep up.",
  },
  {
    question: "Can I import my notes from other apps?",
    answer: "We currently support plain text and Markdown import. Support for Notion and Obsidian is in active development and will be available soon.",
  },
  {
    question: "Is my data secure?",
    answer: "All notes are encrypted at rest and in transit. We never sell your data, and you can export everything at any time. Your thoughts belong to you.",
  },
  {
    question: "Can I share notes with others?",
    answer: "Yes — you can share individual notes via a secure public link. Real-time collaboration features are planned for a future release.",
  },
];

function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        itemRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
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
    <div ref={itemRef} className="border border-foreground/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
      >
        <span className="text-lg font-medium text-foreground pr-4">{question}</span>
        <span
          className="relative w-6 h-6 shrink-0 text-foreground transition-transform duration-300"
          style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1.5px] bg-current" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1.5px] h-4 bg-current" />
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 text-foreground/70 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            end: "top 50%",
            scrub: 1,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="faq" className="bg-background py-24 lg:py-32">
      <div className="px-6 sm:px-12 lg:px-24 max-w-4xl mx-auto">
        <div ref={titleRef} className="text-center mb-12 lg:mb-16">
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              margin: '0 0 12px',
            }}
          >
            FAQ
          </p>
          <h2
            className="text-4xl lg:text-5xl tracking-tight text-foreground"
            style={{ fontFamily: 'var(--serif-display)', fontWeight: 400 }}
          >
            Frequently Asked
            <br />
            Questions
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <FaqItem key={index} question={faq.question} answer={faq.answer} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
