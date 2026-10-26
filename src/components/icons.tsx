import type { SVGProps } from "react";

/**
 * Sohum Systems icon set.
 *
 * Drawn for this site on a 24-unit grid: 1.6 stroke, square caps, mitred
 * joins. Subject icons carry one soft filled detail (the `A` element), the
 * set's signature. Utility icons (arrows, chevrons) are pure line.
 *
 * Every icon is decorative by default (aria-hidden); pass a <title> child or
 * aria-label when an icon carries meaning on its own.
 */

export type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number | string };
export type IconComponent = (props: IconProps) => React.JSX.Element;

function make(body: React.ReactNode) {
  const Icon = ({ strokeWidth = 1.6, className = "", ...rest }: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={`size-5 ${className}`}
      {...rest}
    >
      {body}
    </svg>
  );
  return Icon;
}

/** The signature soft fill. */
const A = (props: SVGProps<SVGPathElement>) => <path fill="currentColor" fillOpacity={0.16} stroke="none" {...props} />;

/* ---------------------------------------------------------------- Utility */
export const ArrowRight = make(<path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />);
export const ArrowLeft = make(<path d="M20 12H5M10.5 6.5 5 12l5.5 5.5" />);
export const ArrowUp = make(<path d="M12 20V5M6.5 10.5 12 5l5.5 5.5" />);
export const ArrowUpRight = make(<path d="M7 17 17 7M8.5 7H17v8.5" />);
export const ChevronDown = make(<path d="m6.5 9.5 5.5 5.5 5.5-5.5" />);
export const ChevronRight = make(<path d="m9.5 6.5 5.5 5.5-5.5 5.5" />);
export const Plus = make(<path d="M12 5v14M5 12h14" />);
export const X = make(<path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />);
export const Check = make(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const Copy = make(<><A d="M9 9h11v11H9z" /><path d="M9 9h11v11H9zM15 9V4H4v11h5" /></>);
export const Search = make(<><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>);
export const Loader2 = make(<path d="M20 12a8 8 0 1 1-8-8" />);

/* ---------------------------------------------------------------- Contact */
export const Mail = make(<><A d="M3 5h18L12 12z" /><path d="M3 5h18v14H3zM3 5.5l9 7 9-7" /></>);
export const Phone = make(<><A d="M7.5 3h9v15h-9z" /><path d="M7 2.5h10v19H7zM10.5 18.5h3" /></>);
export const MapPin = make(
  <>
    <path d="M12 21s-6.5-6.2-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.4" fill="currentColor" stroke="none" />
  </>,
);
export const Printer = make(<><A d="M7 14h10v7H7z" /><path d="M7 9V3h10v6M3 9h18v8h-4M7 17H3V9M7 14h10v7H7z" /></>);
export const Send = make(<><A d="M3 11 21 3l-7.5 18-3-7.5z" /><path d="M3 11 21 3l-7.5 18-3-7.5zM10.5 13.5 21 3" /></>);

/* ---------------------------------------------------------------- Status */
export const AlertCircle = make(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16v.5" /></>);
export const CheckCircle2 = make(<><A d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z" /><circle cx="12" cy="12" r="8.5" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></>);
export const CircleDot = make(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></>);
export const Target = make(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></>);

/* ---------------------------------------------------------------- Capabilities */
export const Braces = make(<path d="M9 4H6.5v6.5L4.5 12l2 1.5V20H9M15 4h2.5v6.5l2 1.5-2 1.5V20H15" />);
export const Cloud = make(<><A d="M7 18.5h10.5a4 4 0 0 0 .4-8A5.6 5.6 0 0 0 7 10a4.25 4.25 0 0 0 0 8.5Z" /><path d="M7 18.5h10.5a4 4 0 0 0 .4-8A5.6 5.6 0 0 0 7 10a4.25 4.25 0 0 0 0 8.5Z" /></>);
export const Cpu = make(<><A d="M9.5 9.5h5v5h-5z" /><path d="M6 6h12v12H6zM9.5 9.5h5v5h-5zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>);
export const MapPinned = make(<><A d="M9 4l6 2v14l-6-2z" /><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" /></>);
export const Database = make(
  <>
    <A d="M5 6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5-3.1-2.5-7-2.5S5 4.6 5 6Z" />
    <ellipse cx="12" cy="6" rx="7" ry="2.5" />
    <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
  </>,
);
export const BarChart3 = make(<><A d="M10.5 7h3v13h-3z" /><path d="M3.5 20.5h17M5.5 13h3v7h-3zM10.5 7h3v13h-3zM15.5 10h3v10h-3z" /></>);
export const Workflow = make(<><A d="M3 3h7v7H3z" /><path d="M3 3h7v7H3zM14 14h7v7h-7zM6.5 10v7.5H11M11.5 15l2.5 2.5-2.5 2.5" /></>);
export const BadgeCheck = make(<><A d="M4 4h16v16H4z" /><path d="M4 4h16v16H4zM8 12.5l3 3 5-6" /></>);
export const ClipboardList = make(<><A d="M9 3.5h6v3H9z" /><path d="M9 3.5h6v3H9zM7 5H5v16h14V5h-2M8.5 11h7M8.5 15h5" /></>);
export const ClipboardCheck = make(<><A d="M9 3.5h6v3H9z" /><path d="M9 3.5h6v3H9zM7 5H5v16h14V5h-2M8.5 13.5l2.5 2.5 4.5-5" /></>);
export const Boxes = make(<><A d="M8 3h8v8H8z" /><path d="M8 3h8v8H8zM3 13h8v8H3zM13 13h8v8h-8z" /></>);
export const Files = make(<><A d="M8 3h8l4 4v12H8z" /><path d="M8 3h8l4 4v12H8zM16 3v4h4M4 7v14h11" /></>);
export const FileText = make(<><A d="M6 3h8l5 5v13H6z" /><path d="M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h5" /></>);
export const FileCheck2 = make(<><A d="M6 3h8l5 5v13H6z" /><path d="M6 3h8l5 5v13H6zM14 3v5h5M9 15l2.2 2.2L15.5 13" /></>);

/* ---------------------------------------------------------------- Company & people */
export const Users = make(
  <>
    <A d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5z" />
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15.5 5a3 3 0 0 1 0 6M17.5 14.7c2.2.7 3.5 2.6 3.5 5.3" />
  </>,
);
export const Users2 = Users;
export const UsersRound = Users;
export const Landmark = make(<><A d="M3 8.5 12 4l9 4.5z" /><path d="M3 8.5 12 4l9 4.5zM5.5 8.5v9M10 8.5v9M14 8.5v9M18.5 8.5v9M3 20.5h18" /></>);
export const Handshake = make(<><A d="M4 5h16v10H10l-5 4v-4H4z" /><path d="M4 5h16v10H10l-5 4v-4H4zM8 9.5h8M8 12h5" /></>);
export const HeartHandshake = make(<><A d="M12 20s-8-4.8-8-10.2a4.3 4.3 0 0 1 8-2.4 4.3 4.3 0 0 1 8 2.4C20 15.2 12 20 12 20Z" /><path d="M12 20s-8-4.8-8-10.2a4.3 4.3 0 0 1 8-2.4 4.3 4.3 0 0 1 8 2.4C20 15.2 12 20 12 20Z" /></>);
export const ShieldCheck = make(<><A d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6zM8.5 12l2.5 2.5 4.5-5" /></>);
export const Lock = make(<><A d="M5 10.5h14V21H5z" /><path d="M5 10.5h14V21H5zM8 10.5V7a4 4 0 0 1 8 0v3.5M12 14.5v3" /></>);
export const GraduationCap = make(<><A d="M2.5 9 12 4.5 21.5 9 12 13.5z" /><path d="M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-5M21.5 9v6" /></>);
export const Briefcase = make(<><A d="M3 7h18v5H3z" /><path d="M3 7h18v13H3zM9 7V4h6v3M3 12h18" /></>);
export const Building2 = make(<><A d="M4 3h10v18H4z" /><path d="M4 21V3h10v18M14 9h6v12M2 21h20M7.5 7h3M7.5 11h3M7.5 15h3M16.5 13h1.5M16.5 17h1.5" /></>);
export const Banknote = make(<><A d="M2.5 6h19v12h-19z" /><path d="M2.5 6h19v12h-19zM6 9v6M18 9v6" /><circle cx="12" cy="12" r="2.5" /></>);
export const Signal = make(<path d="M5 20v-3M10 20v-7M15 20v-11M20 20V4" strokeWidth={2.4} />);
export const Quote = make(<path d="M5 18v-6l3-6h2l-2 6h2v6zM14 18v-6l3-6h2l-2 6h2v6z" />);
