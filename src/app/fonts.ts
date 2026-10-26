import { Archivo, JetBrains_Mono, Manrope } from "next/font/google";

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

/** Wordmark face: a sturdy grotesque, as used by established federal contractors. */
export const wordmark = Archivo({
  subsets: ["latin"],
  variable: "--ff-wordmark",
  display: "swap",
  weight: ["400", "800"],
});
