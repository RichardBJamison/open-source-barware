"use client";

import { useState } from "react";
import {
  getUpdatesSignupStatus,
  setUpdatesSignupStatus,
  submitUpdatesSignup,
  US_STATES,
} from "@/lib/updates-signup";

function WizardPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel rivets rounded-sm p-8 md:p-12 relative grain">
      {children}
    </div>
  );
}

export default function UpdatesSignupStep({
  onNext,
}: {
  onNext: () => void;
}) {
  const priorStatus = getUpdatesSignupStatus();
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [tourOptIn, setTourOptIn] = useState(false);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const skip = () => {
    setUpdatesSignupStatus("skipped");
    onNext();
  };

  const join = async () => {
    if (!optIn && !tourOptIn) {
      skip();
      return;
    }

    setSubmitting(true);
    setStatus("");
    const result = await submitUpdatesSignup({
      email,
      city,
      state,
      programUpdates: optIn,
      hiddenBarTour: tourOptIn,
    });
    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.message);
      return;
    }

    setStatus(result.message);
    window.setTimeout(onNext, 700);
  };

  if (priorStatus === "subscribed") {
    return (
      <WizardPanel>
        <div className="max-w-lg mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl copper-text mb-3">
            You are on the list
          </h2>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            We will only email you when new program additions and releases ship.
            No spam while we keep building.
          </p>
          <button
            type="button"
            onClick={onNext}
            className="bg-copper hover:bg-copper-bright text-bg font-semibold px-10 py-3.5 text-sm tracking-wide transition-all"
          >
            Continue setup
          </button>
        </div>
      </WizardPanel>
    );
  }

  return (
    <WizardPanel>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-patina-light mb-3">
            Optional
          </p>
          <h2 className="font-serif text-3xl md:text-4xl copper-text mb-3">
            Stay on the release list
          </h2>
          <p className="text-text-muted text-sm leading-relaxed max-w-md mx-auto">
            We are still building this program. Drop your email — we only write
            when new additions ship. No marketing blasts while we build.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.15em] text-text-muted">
              Email <span className="text-copper">*</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbar.com"
              autoComplete="email"
              autoFocus
              required
              className="w-full bg-bg-warm border border-gear-border rounded-sm px-4 py-3 text-cream focus:outline-none focus:border-copper focus:shadow-[0_0_20px_rgba(168,120,79,0.12)]"
            />
          </label>

          <label className="flex items-center gap-4 border border-gear-border bg-bg/40 px-4 py-4 rounded-sm cursor-pointer">
            <span className="osb-toggle">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
              />
              <span className="osb-toggle-track" aria-hidden="true" />
              <span className="osb-toggle-knob" aria-hidden="true" />
            </span>
            <span className="text-sm text-text-muted leading-relaxed">
              Yes — email me only when Open Source Barware ships new additions.
            </span>
          </label>

          <label className="flex items-center gap-4 border border-gear-border bg-bg/40 px-4 py-4 rounded-sm cursor-pointer">
            <span className="osb-toggle">
              <input
                type="checkbox"
                checked={tourOptIn}
                onChange={(e) => setTourOptIn(e.target.checked)}
              />
              <span className="osb-toggle-track" aria-hidden="true" />
              <span className="osb-toggle-knob" aria-hidden="true" />
            </span>
            <span className="text-sm text-text-muted leading-relaxed">
              Also invite me to Hidden Bar Tour discovery runs in my city.
            </span>
          </label>

          {tourOptIn && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-[0.15em] text-text-muted">
                  City <span className="text-copper">*</span>
                </span>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="city"
                  autoComplete="address-level2"
                  className="w-full bg-bg-warm border border-gear-border rounded-sm px-4 py-3 text-cream focus:outline-none focus:border-copper"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-[0.15em] text-text-muted">
                  State <span className="text-copper">*</span>
                </span>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-bg-warm border border-gear-border rounded-sm px-4 py-3 text-cream focus:outline-none focus:border-copper"
                >
                  <option value="">Select state</option>
                  {US_STATES.map(([abbr, name]) => (
                    <option key={abbr} value={abbr}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        {status && (
          <p
            className={`text-sm mb-4 text-center ${
              status.includes("on the list") || status.includes("release list")
                ? "text-patina-light"
                : "text-copper"
            }`}
          >
            {status}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={skip}
            disabled={submitting}
            className="border border-gear-border text-text-muted hover:text-copper hover:border-copper/40 px-8 py-3 text-sm tracking-wide transition-all"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={join}
            disabled={submitting}
            className="bg-copper hover:bg-copper-bright disabled:bg-bg-card disabled:text-text-light text-bg font-semibold px-10 py-3 text-sm tracking-wide transition-all"
          >
            {submitting ? "Saving..." : "Join the release list"}
          </button>
        </div>
      </div>
    </WizardPanel>
  );
}