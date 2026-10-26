import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";

/** Wide display face for the homepage's uppercase headlines. */
export const wide = Unbounded({
  subsets: ["latin"],
  variable: "--ff-wide",
  display: "swap",
  weight: ["500", "600", "700"],
});

/** Mono face for labels, buttons, and readouts. */
export const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--ff-tech",
  display: "swap",
  weight: ["400", "500"],
});

/** Brand face for the Sohum Systems wordmark and navigation. */
export const brand = Manrope({
  subsets: ["latin"],
  variable: "--ff-brand",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});
