import { Outlet, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { name: "theme-color", content: "#1a1330" },
      { title: "Veil — Private messaging" },
      {
        name: "description",
        content: "Veil is a premium real-time messenger. Fast, beautiful, private by design.",
      },
      { property: "og:title", content: "Veil — Private messaging" },
      {
        property: "og:description",
        content: "Premium real-time messaging for private conversations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Veil — Private messaging" },
      {
        name: "description",
        content: "A social media app for private conversations with the people you choose.",
      },
      {
        property: "og:description",
        content: "A social media app for private conversations with the people you choose.",
      },
      {
        name: "twitter:description",
        content: "A social media app for private conversations with the people you choose.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/hxEE3nVOQGZ9Bq3OJGHIvEimYFN2/social-images/social-1778763675356-1000216224.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/hxEE3nVOQGZ9Bq3OJGHIvEimYFN2/social-images/social-1778763675356-1000216224.webp",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong rounded-3xl p-10 text-center">
        <h1 className="text-6xl font-bold text-gradient">404</h1>
        <p className="mt-3 text-muted-foreground">This veil hides nothing here.</p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Go home
        </a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { pathname } = useLocation();
  // Use the first two path segments as the transition key so navigating within
  // a section (e.g. /chat/$peerId) doesn't re-trigger fades on every param change.
  const key = pathname.split("/").slice(0, 3).join("/") || "/";
  return (
    <AuthProvider>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <Toaster />
    </AuthProvider>
  );
}
