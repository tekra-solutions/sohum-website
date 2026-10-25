"use client";

/**
 * The homepage's one signature moment: a GIS-style view of where Sohum works.
 *
 * Rendering is progressive. The static SVG (same projection, same markers,
 * fully clickable) paints with the page; WebGL loads only when the hero is on
 * screen and the browser is idle, then cross-fades in. Without WebGL the
 * static map stays, with the same inspector. Every marker is also a real
 * button in an off-screen list, so the map works without a pointer.
 */
import dynamic from "next/dynamic";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ArrowRight, Hand, Layers, X } from "lucide-react";
import {
  HQ,
  featureColor,
  getFeature,
  groupSites,
  layers,
  projectFallback,
  siteColor,
  visibleFeatures,
  type Feature,
  type LayerId,
} from "@/content/globe";
import { FOCUS_EVENT } from "./PastPerformance";
import { useToday } from "./useToday";
import type { GlobeCanvasProps, Nudge } from "./GlobeCanvas";

const GlobeCanvas = dynamic<GlobeCanvasProps>(() => import("./GlobeCanvas"), { ssr: false });

const ALL_LAYERS: LayerId[] = layers.map((l) => l.id);
const DESKTOP = "(min-width: 1024px)";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function MissionGlobe({ initialDay }: { initialDay: string }) {
  const day = useToday(initialDay);
  const reducedMotion = Boolean(useReducedMotion());

  const [enabled, setEnabled] = useState<LayerId[]>(ALL_LAYERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mountGL, setMountGL] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(false);
  const [size, setSize] = useState(0);
  const [coarse, setCoarse] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const [exploring, setExploring] = useState(false);
  const [nudge, setNudge] = useState<Nudge>({ lat: 0, lng: 0, rev: 0 });

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const visible = useMemo(() => visibleFeatures(enabled, day), [enabled, day]);
  const sites = useMemo(() => groupSites(visible), [visible]);
  const selected = selectedId ? visible.find((f) => f.id === selectedId) ?? null : null;
  const selectedSite = selected ? sites.find((s) => s.features.includes(selected)) ?? null : null;

  /* ------------------------------------------------------------ Selection */

  const writeUrl = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("focus", id);
    else url.searchParams.delete("focus");
    window.history.replaceState(window.history.state, "", url);
  };

  const select = useCallback((feature: Feature) => {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      returnFocus.current = document.activeElement;
    }
    setEnabled((current) => (current.includes(feature.layer) ? current : [...current, feature.layer]));
    setSelectedId(feature.id);
    writeUrl(feature.id);
    requestAnimationFrame(() => closeButton.current?.focus({ preventScroll: true }));
  }, []);

  const close = useCallback(() => {
    setSelectedId(null);
    writeUrl(null);
    const target = returnFocus.current;
    returnFocus.current = null;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus({ preventScroll: true });
    });
  }, []);

  const selectSite = useCallback(
    (siteId: string) => {
      const site = sites.find((s) => s.id === siteId);
      if (site) select(site.features[0]);
    },
    [sites, select],
  );

  // Closing on an empty-globe click: only when something is open.
  const selectedRef = useRef(selectedId);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  const onBackgroundClick = useCallback(() => {
    if (selectedRef.current) close();
  }, [close]);

  /* ------------------------------------------------------ Environment */

  useEffect(() => {
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const desktopQuery = window.matchMedia(DESKTOP);
    const update = () => {
      setCoarse(coarseQuery.matches);
      setDesktop(desktopQuery.matches);
    };
    update();
    coarseQuery.addEventListener("change", update);
    desktopQuery.addEventListener("change", update);
    return () => {
      coarseQuery.removeEventListener("change", update);
      desktopQuery.removeEventListener("change", update);
    };
  }, []);

  // Size from the stage, which CSS keeps square and capped (580px / 340px).
  useEffect(() => {
    const el = stage.current!;
    const observer = new ResizeObserver(([entry]) => setSize(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render only while on screen and the tab is visible. Load WebGL the first
  // time the globe is on screen, once the browser is idle.
  useEffect(() => {
    const el = root.current!;
    let inView = false;
    let scheduled = false;
    let idle: number | undefined;
    let timer: number | undefined;
    const update = () => setActive(inView && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
        if (inView && !scheduled) {
          scheduled = true;
          const load = () => (supportsWebGL() ? setMountGL(true) : setFailed(true));
          if (typeof window.requestIdleCallback === "function") {
            idle = window.requestIdleCallback(load, { timeout: 2500 });
          } else {
            timer = window.setTimeout(load, 600);
          }
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, []);

  // Never hang on a loader: if WebGL has not drawn in 15s, keep the static map.
  useEffect(() => {
    if (!mountGL || ready || failed) return;
    const timer = window.setTimeout(() => setFailed(true), 15_000);
    return () => window.clearTimeout(timer);
  }, [mountGL, ready, failed]);

  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  /* ------------------------------------------- Deep links and page events */

  useEffect(() => {
    const fromUrl = getFeature(new URL(window.location.href).searchParams.get("focus"));
    if (fromUrl) requestAnimationFrame(() => select(fromUrl));
    const onFocusEvent = (event: Event) => {
      const feature = getFeature((event as CustomEvent<string>).detail);
      if (feature) select(feature);
    };
    window.addEventListener(FOCUS_EVENT, onFocusEvent);
    return () => window.removeEventListener(FOCUS_EVENT, onFocusEvent);
  }, [select]);

  // Esc closes; a tap outside ends exploring and closes the inspector;
  // scrolling the page ends exploring so touch never traps the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setExploring(false);
      if (selectedRef.current) close();
    };
    const onPointer = (event: PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return;
      if ((event.target as Element | null)?.closest?.("[data-globe-inspector]")) return;
      setExploring(false);
      if (selectedRef.current) close();
    };
    let lastY = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - lastY) > 48) {
        lastY = window.scrollY;
        setExploring(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [close]);

  /* ------------------------------------------------------------- Input */

  const onStageKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, [number, number]> = {
      ArrowUp: [10, 0],
      ArrowDown: [-10, 0],
      ArrowLeft: [0, -15],
      ArrowRight: [0, 15],
    };
    const move = step[event.key];
    if (!move) return;
    event.preventDefault();
    setNudge((n) => ({ lat: move[0], lng: move[1], rev: n.rev + 1 }));
  };

  const toggleLayer = (id: LayerId) => {
    setEnabled((current) => (current.includes(id) ? current.filter((l) => l !== id) : [...current, id]));
    if (selected?.layer === id) close();
  };

  const interactive = !coarse || exploring;
  const showStatic = !ready || failed;

  /* ------------------------------------------------------------ Render */

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        id="mission-globe"
        ref={root}
        role="group"
        aria-label="Mission map: Sohum Systems headquarters, places of performance from federal award records, the agencies that administer our contract vehicles, and the National Capital Region."
        className="mission-globe relative mx-auto w-full min-w-0 max-w-[640px] scroll-mt-32 rounded-[8px] border border-hairline bg-night-900/60 shadow-[0_40px_120px_-40px_rgba(2,6,16,0.9)]"
      >
        {/* Viewport title bar, as in a GIS client. */}
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-3 font-mono text-[0.6875rem] text-mist-400">
          <span className="flex shrink-0 items-center gap-2 whitespace-nowrap uppercase tracking-[0.14em] text-mist-200">
            <span aria-hidden="true" className="relative flex size-2">
              {/* CSS, not JS, decides motion here so server and client markup match. */}
              <span className="absolute inset-0 rounded-full bg-azure-400/60 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-azure-400" />
            </span>
            Mission map
          </span>
          <span className="truncate">
            {failed
              ? "Static map · select a marker"
              : coarse
                ? "Tap to explore"
                : "Drag to rotate · click a marker"}
          </span>
        </div>

        {/* Stage: reserves a square box so nothing shifts when WebGL arrives. */}
        <div className="relative mx-auto my-2 aspect-square w-full max-w-[340px] sm:max-w-[480px] lg:max-w-[560px]">
          {/* Corner registration ticks. */}
          {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((c) => (
            <span key={c} aria-hidden="true" className={`pointer-events-none absolute size-4 border-azure-400/40 ${c}`} />
          ))}
          <div
            ref={stage}
            tabIndex={0}
            role="application"
            aria-roledescription="globe"
            aria-label="Interactive globe. Arrow keys rotate. Use the location list after the layer controls to inspect each marker."
            onKeyDown={onStageKey}
            className={`absolute inset-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-azure-400 focus-visible:ring-offset-4 focus-visible:ring-offset-night-950 ${
              interactive ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            {/* Static map: first paint, loading state, and no-WebGL fallback. */}
            <div
              aria-hidden={!showStatic}
              className={`absolute inset-0 transition-opacity duration-300 ${showStatic ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation to gain */}
              <img src="/data/mission-fallback.svg" alt="" width={580} height={580} className="size-full" decoding="async" />
              <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
                {sites.map((s) => {
                  const p = projectFallback(s.lat, s.lng);
                  if (!p.visible) return null;
                  const isHq = s.features.some((f) => f.id === "hq");
                  return (
                    <g key={s.id}>
                      {isHq && <circle cx={p.x} cy={p.y} r={1.4} fill="none" stroke="#fa752e" strokeWidth={0.3} className="hq-pulse" />}
                      <circle cx={p.x} cy={p.y} r={s.id === selectedSite?.id ? 1.5 : 1.1} fill={siteColor(s)} />
                    </g>
                  );
                })}
                {sites.some((s) => s.features.some((f) => f.id === "hq")) &&
                  sites
                    .filter((s) => !s.features.some((f) => f.id === "hq"))
                    .map((s) => {
                      const a = projectFallback(HQ.lat, HQ.lng);
                      const b = projectFallback(s.lat, s.lng);
                      if (!a.visible || !b.visible) return null;
                      const mx = (a.x + b.x) / 2;
                      const my = Math.min(a.y, b.y) - Math.abs(b.x - a.x) * 0.25;
                      return (
                        <path
                          key={s.id}
                          d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeOpacity={0.55}
                          strokeWidth={0.25}
                          strokeDasharray="1.2 1"
                        />
                      );
                    })}
              </svg>
              {/* Pointer targets for the static map. Keyboard users get the list below. */}
              {showStatic &&
                sites.map((s) => {
                  const p = projectFallback(s.lat, s.lng);
                  if (!p.visible) return null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      onClick={() => select(s.features[0])}
                      title={s.features.map((f) => f.label).join("\n")}
                      className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full hover:bg-azure-400/15"
                      style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    />
                  );
                })}
            </div>

            {mountGL && !failed && size > 0 && (
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
                style={{ pointerEvents: interactive ? "auto" : "none" }}
                aria-hidden="true"
              >
                <GlobeCanvas
                  size={size}
                  sites={sites}
                  selectedSiteId={selectedSite?.id ?? null}
                  focusShift={desktop ? 18 : 0}
                  reducedMotion={reducedMotion}
                  active={active}
                  nudge={nudge}
                  onSelectSite={selectSite}
                  onBackgroundClick={onBackgroundClick}
                  onReady={onReady}
                  onFailure={onFailure}
                />
              </div>
            )}
          </div>

          {coarse && ready && !failed && (
            <button
              type="button"
              onClick={() => setExploring((v) => !v)}
              aria-pressed={exploring}
              className="absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-night-600 bg-night-850/95 px-4 py-2.5 font-mono text-[0.75rem] text-mist-50"
            >
              <Hand className="size-3.5" aria-hidden="true" />
              {exploring ? "Done exploring" : "Tap to explore"}
            </button>
          )}

          <AnimatePresence>
            {selected && desktop && (
              <Inspector
                key="desktop"
                feature={selected}
                siblings={selectedSite?.features ?? [selected]}
                day={day}
                onSelect={select}
                onClose={close}
                closeRef={closeButton}
                reducedMotion={reducedMotion}
                variant="panel"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Layer list, styled after a GIS table of contents. */}
        <fieldset className="border-t border-hairline px-4 pb-2 pt-3">
          <legend className="sr-only">Map layers</legend>
          <p aria-hidden="true" className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-mist-400">
            <Layers className="size-3.5" aria-hidden="true" />
            Layers
          </p>
          <ul className="flex flex-wrap gap-x-6">
            {layers.map((layer) => {
              const count = visibleFeatures([layer.id], day).length;
              return (
                <li key={layer.id}>
                  <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap py-2 font-mono text-[0.75rem] text-mist-200">
                    <input
                      type="checkbox"
                      checked={enabled.includes(layer.id)}
                      onChange={() => toggleLayer(layer.id)}
                      className="size-4 accent-azure-400"
                    />
                    <span aria-hidden="true" className="size-2 rounded-full" style={{ background: layer.color }} />
                    <span>{layer.name}</span>
                    <span className="sr-only">, {count} locations</span>
                    <span aria-hidden="true" className="tabular-nums text-mist-400">
                      {String(count).padStart(2, "0")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Every marker as a real button, grouped by layer. Visible on focus. */}
        <nav
          aria-label="Map locations"
          className="sr-only focus-within:not-sr-only focus-within:m-4 focus-within:block focus-within:rounded-[4px] focus-within:border focus-within:border-azure-400/50 focus-within:p-4"
        >
          {layers
            .filter((l) => enabled.includes(l.id))
            .map((layer) => (
              <div key={layer.id} className="mb-2 last:mb-0">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-mist-400">{layer.name}</p>
                <ul>
                  {visible
                    .filter((f) => f.layer === layer.id)
                    .map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => select(f)}
                          className="py-1.5 text-left text-[0.875rem] text-mist-50 hover:text-azure-300"
                        >
                          Inspect {f.label}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </nav>

        <AnimatePresence>
          {selected && !desktop && (
            <Inspector
              key="sheet"
              feature={selected}
              siblings={selectedSite?.features ?? [selected]}
              day={day}
              onSelect={select}
              onClose={close}
              closeRef={closeButton}
              reducedMotion={reducedMotion}
              variant="sheet"
            />
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

/* ---------------------------------------------------------------- Inspector */

function Inspector({
  feature,
  siblings,
  day,
  onSelect,
  onClose,
  closeRef,
  reducedMotion,
  variant,
}: {
  feature: Feature;
  siblings: Feature[];
  day: string;
  onSelect: (f: Feature) => void;
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  reducedMotion: boolean;
  variant: "panel" | "sheet";
}) {
  const others = siblings.filter((f) => f.id !== feature.id);
  const motionProps =
    variant === "panel"
      ? { initial: { opacity: 0, x: reducedMotion ? 0 : 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: reducedMotion ? 0 : 16 } }
      : { initial: { opacity: 0, y: reducedMotion ? 0 : 32 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reducedMotion ? 0 : 32 } };

  return (
    <m.section
      {...motionProps}
      transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
      data-globe-inspector
      role="dialog"
      aria-modal="false"
      aria-labelledby="inspector-title"
      className={
        variant === "panel"
          ? "absolute right-2 top-[6%] z-10 max-h-[88%] w-[19rem] overflow-y-auto rounded-[4px] border border-night-600 bg-night-850/95 p-5 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)] backdrop-blur-sm"
          : "fixed inset-x-0 bottom-0 z-[60] max-h-[75dvh] overflow-y-auto overscroll-contain rounded-t-[8px] border-t border-night-600 bg-night-850 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-24px_64px_-24px_rgba(0,0,0,0.8)]"
      }
    >
      {variant === "sheet" && <div aria-hidden="true" className="mx-auto -mt-1 mb-4 h-1 w-10 rounded-full bg-night-600" />}
      <div className="flex items-start justify-between gap-4">
        <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-mist-400">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: featureColor(feature) }} />
          {feature.type}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close location details"
          className="-m-2 rounded p-2 text-mist-400 hover:bg-night-800 hover:text-mist-50"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <h2 id="inspector-title" className="mt-3 font-plex text-[1.125rem] font-medium leading-snug text-mist-50">
        {feature.title}
      </h2>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-mist-400">{feature.description}</p>

      <dl className="mt-4 border-t border-hairline">
        {feature.data(day).map((row) => (
          <div key={row.label} className="border-b border-hairline py-2">
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-mist-400">{row.label}</dt>
            <dd className="mt-0.5 font-mono text-[0.8125rem] text-mist-50">{row.value}</dd>
          </div>
        ))}
      </dl>

      <a
        href={feature.href}
        className="group mt-4 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-azure-300 hover:text-mist-50"
      >
        {feature.linkLabel}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </a>

      {others.length > 0 && (
        <div className="mt-5 border-t border-hairline pt-3">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-mist-400">
            Also at this location · {others.length}
          </p>
          <ul className="mt-1">
            {others.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onSelect(f)}
                  className="flex w-full items-center gap-2 py-1.5 text-left text-[0.8125rem] text-mist-200 hover:text-azure-300"
                >
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: featureColor(f) }} />
                  {f.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </m.section>
  );
}
