"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

/**
 * Location input with Google Places Autocomplete. When the user types,
 * Google's API suggests matching addresses/venues; selecting one fills the
 * input with the place's formatted address (and name for venues).
 *
 * Graceful fallback: if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY isn't set, or the
 * Places library fails to load, this just behaves as a plain text input.
 * The form still submits a normal `location` string — no schema changes.
 */
export function LocationInput({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !ref.current) return; // fall back to plain input

    setOptions({ key: apiKey, v: "weekly" });

    let listener: google.maps.MapsEventListener | null = null;
    let cancelled = false;

    importLibrary("places")
      .then((places) => {
        if (cancelled || !ref.current) return;
        // Accept both establishments (venues, halls) and street addresses.
        const ac = new places.Autocomplete(ref.current, {
          fields: ["formatted_address", "name"],
        });
        listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          // Prefer "Name, Address" for venues; otherwise just the address.
          const value =
            place.name && place.formatted_address && place.name !== place.formatted_address
              ? `${place.name}, ${place.formatted_address}`
              : place.formatted_address ?? place.name ?? ref.current?.value ?? "";
          if (ref.current) {
            ref.current.value = value;
            // Fire input event so any React state / form validation notices.
            ref.current.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
      })
      .catch((err) => {
        console.warn("Google Maps Places failed to load:", err);
      });

    return () => {
      cancelled = true;
      if (listener) listener.remove();
    };
  }, []);

  return (
    <input
      ref={ref}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      type="text"
      autoComplete="off"
    />
  );
}
