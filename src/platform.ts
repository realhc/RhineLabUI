/** Desktop has its own entry point; it never initializes the website PWA. */
export const platform: "web" | "desktop" | "wallpaper" =
  import.meta.env.MODE === "desktop"
    ? "desktop"
    : import.meta.env.MODE === "wallpaper"
      ? "wallpaper"
      : "web";
