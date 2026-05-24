"use client";

import { Link } from "react-router-dom";

const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "Features", href: "#features" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const footerLinks = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Contact", href: "#contact" },
];

export function FooterSection() {
  return (
    <footer id="contact" className="lg:sticky lg:bottom-0 lg:z-0 bg-foreground text-background">
      <div className="px-6 sm:px-12 lg:px-24 pt-24 lg:pt-32 pb-16 lg:pb-24 text-center sm:text-left max-w-360 mx-auto">
        <a
          href="mailto:hello@dendrite.app"
          className="text-2xl sm:text-5xl lg:text-7xl font-medium tracking-tight hover:opacity-80 transition-opacity break-all sm:break-normal"
        >
          hello@dendrite.app
        </a>

        <div className="mt-10">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-full bg-background text-foreground hover:bg-background/90 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </div>

      <div className="px-6 sm:px-12 lg:px-24 max-w-360 mx-auto">
        <div className="border-t border-background/10" />
      </div>

      <div className="px-6 sm:px-12 lg:px-24 py-16 lg:py-24 max-w-360 mx-auto">
        <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-8">
          <div>
            <span className="text-4xl font-medium tracking-tight">dendrite</span>
            <p className="mt-4 text-background/60 text-2xl">Think clearly. Write beautifully.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-16 lg:gap-24">
            <div>
              <h4 className="text-sm font-medium text-background/60 mb-6">Platform</h4>
              <div className="mb-6">
                <p className="font-medium mb-1">Web App</p>
                <p className="text-background/60 text-sm">Available in any browser</p>
              </div>
              <div>
                <p className="font-medium mb-1">Desktop</p>
                <p className="text-background/60 text-sm">Coming soon</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-background/60 mb-6">Features</h4>
              <ul className="space-y-3">
                <li><span className="text-background">Rich Text Editor</span></li>
                <li><span className="text-background">Folders & Tags</span></li>
                <li><span className="text-background">Note Sharing</span></li>
                <li><span className="text-background">Dark Mode</span></li>
                <li><span className="text-background">Fast Search</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-background/60 mb-6">Navigation</h4>
              <ul className="space-y-3">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-background hover:text-background/60 transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-background/60 mb-6">Account</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/register" className="text-background hover:text-background/60 transition-colors">
                    Sign Up Free
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-background hover:text-background/60 transition-colors">
                    Log In
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-12 lg:px-24 py-6 max-w-360 mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <p className="text-sm text-background/40">
            © 2026 Dendrite · All rights reserved
          </p>

          <p className="text-sm text-background/40">
            Built with care · Worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
