"use client";

/**
 * WebGL half of the mission globe. Loaded with next/dynamic (ssr: false) only
 * once the hero is on screen and the browser is idle, so three.js never sits on
 * the critical path. All state lives in MissionGlobe; this renders and moves.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial } from "three";
import { HQ, HQ_COLOR, defaultView, focusAltitude, siteColor, type Site } from "@/content/globe";

const ROTATE_SPEED = 0.35;
const RESUME_AFTER_MS = 4000;
const RAMP_MS = 1500;
const FLY_MS = 1000;

export type Nudge = { lat: number; lng: number; rev: number };

export type GlobeCanvasProps = {
  size: number;
  sites: Site[];
  selectedSiteId: string | null;
  /** Degrees of longitude to shift the camera east of a focused site, so it clears the inspector. */
  focusShift: number;
  reducedMotion: boolean;
  /** False when off-screen or the tab is hidden: rendering pauses. */
  active: boolean;
  nudge: Nudge;
  onSelectSite: (id: string) => void;
  onBackgroundClick: () => void;
  onReady: () => void;
  onFailure: () => void;
};

type Point = { id: string; lat: number; lng: number; color: string; label: string };

type CountryFeature = { properties: { ISO_A3: string } };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default function GlobeCanvas({
  size,
  sites,
  selectedSiteId,
  focusShift,
  reducedMotion,
  active,
  nudge,
  onSelectSite,
  onBackgroundClick,
  onReady,
  onFailure,
}: GlobeCanvasProps) {
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [landLoaded, setLandLoaded] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // Latest values for timer callbacks, which outlive the render that set them.
  const live = useRef({ reducedMotion, active, selected: selectedSiteId });
  useEffect(() => {
    live.current = { reducedMotion, active, selected: selectedSiteId };
  });

  /* ------------------------------------------------------------ Rotation */

  const resumeTimer = useRef<number | undefined>(undefined);
  const rampFrame = useRef<number | undefined>(undefined);

  const stopRotation = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    if (rampFrame.current) cancelAnimationFrame(rampFrame.current);
    const controls = globe.current?.controls();
    if (controls) controls.autoRotate = false;
  }, []);

  /** After 4s idle, ease auto-rotate from 0 back to full speed over 1.5s. */
  const scheduleResume = useCallback(() => {
    stopRotation();
    resumeTimer.current = window.setTimeout(() => {
      const { reducedMotion, active, selected } = live.current;
      const controls = globe.current?.controls();
      if (!controls || reducedMotion || !active || selected) return;
      controls.autoRotateSpeed = 0;
      controls.autoRotate = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / RAMP_MS, 1);
        controls.autoRotateSpeed = ROTATE_SPEED * t * t * (3 - 2 * t); // smoothstep
        if (t < 1) rampFrame.current = requestAnimationFrame(tick);
      };
      rampFrame.current = requestAnimationFrame(tick);
    }, RESUME_AFTER_MS);
  }, [stopRotation]);

  useEffect(() => stopRotation, [stopRotation]);

  /* --------------------------------------------------------------- Land */

  useEffect(() => {
    const abort = new AbortController();
    let timer: number | undefined;
    fetch("/data/countries-110m.geojson", { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`countries ${r.status}`);
        return r.json() as Promise<{ features: CountryFeature[] }>;
      })
      .then(({ features }) => {
        // United States first so home reads instantly, then the rest in small
        // batches: hex tessellation is CPU-heavy, and batching keeps each task
        // short enough not to block input.
        const ordered = [...features].sort(
          (a, b) => Number(b.properties.ISO_A3 === "USA") - Number(a.properties.ISO_A3 === "USA"),
        );
        let count = 0;
        const next = () => {
          if (abort.signal.aborted) return;
          count = Math.min(count + 12, ordered.length);
          setCountries(ordered.slice(0, count));
          if (count < ordered.length) timer = window.setTimeout(next, 16);
          else setLandLoaded(true);
        };
        next();
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") onFailure();
      });
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [onFailure]);

  /* -------------------------------------------------------------- Setup */

  const material = useMemo(
    () => new MeshPhongMaterial({ color: "#0b1424", emissive: "#0a1730", emissiveIntensity: 0.6, shininess: 4 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  // three-globe can report ready during construction, before React attaches
  // the ref, so the callback only records it and setup runs in an effect.
  const handleGlobeReady = useCallback(() => setGlobeReady(true), []);

  useEffect(() => {
    const g = globe.current;
    if (!globeReady || !g) return;
    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const controls = g.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.autoRotateSpeed = ROTATE_SPEED;
    controls.autoRotate = !live.current.reducedMotion && !live.current.selected;
    g.pointOfView(defaultView, 0);
  }, [globeReady]);

  const ready = globeReady && landLoaded;
  useEffect(() => {
    if (ready) onReady();
  }, [ready, onReady]);

  /* --------------------------------------------- Pointer, focus, pausing */

  useEffect(() => {
    if (!globeReady) return;
    // Touch devices stay non-interactive through `pointer-events: none` on the
    // wrapper in MissionGlobe. The controls themselves must stay enabled:
    // OrbitControls.update() is what aims the camera, so disabling it blanks
    // the view.
    const g = globe.current!;
    const canvas = g.renderer().domElement;
    const down = () => stopRotation();
    const up = () => scheduleResume();
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("webglcontextlost", lost);
    };
  }, [globeReady, onFailure, scheduleResume, stopRotation]);

  useEffect(() => {
    if (!globeReady) return;
    const g = globe.current!;
    if (active) {
      g.resumeAnimation();
      if (!selectedSiteId && !reducedMotion && !g.controls().autoRotate) scheduleResume();
    } else {
      stopRotation();
      g.pauseAnimation();
    }
  }, [globeReady, active, reducedMotion, selectedSiteId, scheduleResume, stopRotation]);

  // Fly to the selected site, or back to the default view when cleared.
  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;
  const flyLat = selectedSite?.lat;
  const flyLng = selectedSite?.lng;
  const isFirstFly = useRef(true);
  useEffect(() => {
    if (!globeReady) return;
    const g = globe.current!;
    const ms = reducedMotion ? 0 : FLY_MS;
    if (flyLat !== undefined && flyLng !== undefined) {
      stopRotation();
      const shift = focusShift / Math.max(Math.cos((flyLat * Math.PI) / 180), 0.5);
      g.pointOfView({ lat: flyLat, lng: flyLng + shift, altitude: focusAltitude }, ms);
    } else if (!isFirstFly.current) {
      g.pointOfView(defaultView, ms);
      if (!reducedMotion) scheduleResume();
    }
    isFirstFly.current = false;
  }, [globeReady, flyLat, flyLng, focusShift, reducedMotion, scheduleResume, stopRotation]);

  // Arrow-key rotation from the keyboard handler in MissionGlobe.
  const lastNudge = useRef(nudge.rev);
  useEffect(() => {
    if (!globeReady || nudge.rev === lastNudge.current) return;
    lastNudge.current = nudge.rev;
    const g = globe.current!;
    const pov = g.pointOfView();
    stopRotation();
    g.pointOfView(
      { lat: Math.max(-80, Math.min(80, pov.lat + nudge.lat)), lng: pov.lng + nudge.lng },
      reducedMotion ? 0 : 300,
    );
    if (!live.current.selected && !reducedMotion) scheduleResume();
  }, [globeReady, nudge, reducedMotion, scheduleResume, stopRotation]);

  /* --------------------------------------------------------------- Layers */

  const points = useMemo<Point[]>(
    () =>
      sites.map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        color: siteColor(s),
        label:
          s.features.length > 1
            ? `${s.features[0].label} · +${s.features.length - 1} more`
            : s.features[0].label,
      })),
    [sites],
  );

  const hqSite = sites.find((s) => s.features.some((f) => f.id === "hq"));
  const arcs = useMemo(
    () =>
      hqSite
        ? sites
            .filter((s) => s !== hqSite)
            .map((s) => ({ startLat: HQ.lat, startLng: HQ.lng, endLat: s.lat, endLng: s.lng }))
        : [],
    [sites, hqSite],
  );
  const rings = useMemo(() => (hqSite && !reducedMotion ? [{ lat: HQ.lat, lng: HQ.lng }] : []), [hqSite, reducedMotion]);

  const emphasized = (id: string) => id === hovered || id === selectedSiteId;

  return (
    <Globe
      ref={globe}
      width={size}
      height={size}
      backgroundColor="rgba(0,0,0,0)"
      rendererConfig={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      animateIn={false}
      globeMaterial={material}
      showAtmosphere
      atmosphereColor="#38bdf8"
      atmosphereAltitude={0.15}
      onGlobeReady={handleGlobeReady}
      onGlobeClick={onBackgroundClick}
      hexPolygonsData={countries}
      hexPolygonResolution={3}
      hexPolygonMargin={0.35}
      hexPolygonUseDots
      hexPolygonsTransitionDuration={0}
      hexPolygonColor={(d) =>
        (d as CountryFeature).properties.ISO_A3 === "USA" ? "rgba(56,189,248,0.85)" : "rgba(56,189,248,0.3)"
      }
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor="color"
      pointAltitude={0.012}
      pointRadius={(d) => (emphasized((d as Point).id) ? 1.3 : 1) * 1.25}
      pointResolution={24}
      pointsTransitionDuration={reducedMotion ? 0 : 200}
      pointLabel={(d) => escapeHtml((d as Point).label)}
      onPointHover={(d) => setHovered(d ? (d as Point).id : null)}
      onPointClick={(d) => onSelectSite((d as Point).id)}
      arcsData={arcs}
      arcColor={() => [HQ_COLOR, "#38bdf8"]}
      arcStroke={0.55}
      arcAltitudeAutoScale={0.55}
      arcDashLength={reducedMotion ? 1 : 0.4}
      arcDashGap={reducedMotion ? 0 : 0.6}
      arcDashAnimateTime={reducedMotion ? 0 : 3200}
      arcsTransitionDuration={reducedMotion ? 0 : 400}
      ringsData={rings}
      ringColor={() => (t: number) => `rgba(250,117,46,${1 - t})`}
      ringMaxRadius={2.6}
      ringPropagationSpeed={1.6}
      ringRepeatPeriod={1800}
    />
  );
}
