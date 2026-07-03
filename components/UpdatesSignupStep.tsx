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
            We are still building this program. Join the update list and we will
            only email you when new additions ship — scale import, notifications,
            full liquor and wine inventory, Hidden Bar Tour news, and everything
            else on the roadmap.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.15em] text-text-muted">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbar.com"
              autoComplete="email"
              className="w-full bg-bg-warm border border-gear-border rounded-sm px-4 py-3 text-cream focus:outline-none focus:border-copper focus:shadow-[0_0_20px_rgba(168,120,79,0.12)]"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-[0.15em] text-text-muted">
                City
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cleveland"
                autoComplete="address-level2"
                className="w-full bg-bg-warm border border-gear-border rounded-sm px-4 py-3 text-cream focus:outline-none focus:border-copper"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-[0.15em] text-text-muted">
                State
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

          <label className="flex items-start gap-3 border border-gear-border bg-bg/40 px-4 py-3 rounded-sm cursor-pointer">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-text-muted leading-relaxed">
              Yes — email me only when Open Source Barware ships new additions.
              No marketing blasts while we build.
            </span>
          </label>

          <label className="flex items-start gap-3 border border-gear-border bg-bg/40 px-4 py-3 rounded-sm cursor-pointer">
            <input
              type="checkbox"
              checked={tourOptIn}
              onChange={(e) => setTourOptIn(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-text-muted leading-relaxed">
              Email me when World Hidden Bar Tours go online. Invite me to the
              discovery run of your city.
            </span>
          </label>
        </div>

        {status && (
          <p
            className={`text-sm mb-4 text-center ${
              status.includes("on the list") ? "text-patina-light" : "text-copper"
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