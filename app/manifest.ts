import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FuelTrack",
    short_name: "FuelTrack",
    description: "A fuel gauge for bikes that don't have one.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f9",
    theme_color: "#0077b6",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon: one tap to mark reserve while riding.
    shortcuts: [
      { name: "On reserve", short_name: "Reserve", url: "/quick/reserve", icons: [{ src: "/icon/192", sizes: "192x192" }] },
      { name: "Add fuel", short_name: "Add fuel", url: "/fill", icons: [{ src: "/icon/192", sizes: "192x192" }] },
    ],
  };
}
