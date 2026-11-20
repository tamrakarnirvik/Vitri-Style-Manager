import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "vitristyle Manager",
    short_name: "vitristyle",
    description: "Private business dashboard for vitristyle.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8fc",
    theme_color: "#ffffff",
    icons: [
      { src: "/vitristyle-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/vitristyle-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
