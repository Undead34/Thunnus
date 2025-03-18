import { defineMiddleware } from "astro:middleware";

import { app } from "./firebase/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

import { pathToRegexp } from "path-to-regexp";

const db = getFirestore(app);

let cachedTemplatePath: string = "/templates/default";

const setupFirestoreListener = () => {
  const settingsRef = db.collection("settings").doc("template");
  const unsubscribe = settingsRef.onSnapshot(
    (doc) => {
      if (doc.exists) {
        cachedTemplatePath = String(doc.data()?.path || "/templates/default");
        console.log("Cache actualizado:", cachedTemplatePath);
      }
    },
    (error) => {
      console.error("Error en listener de Firestore:", error);
    }
  );

  return unsubscribe;
};

// Inicializar cache y configurar listener
setupFirestoreListener();

interface Matcher {
  public: string[];
  protected: string[];
  observed: string[];
}

const matcher: Matcher = {
  public: ["/"],
  protected: ["/dashboard/:path", "/dashboard"],
  observed: ["/public/tracking-pixel.png", "/tracking-pixel.png"],
};

// Middleware
export const onRequest = defineMiddleware(async (context, next) => {
  const currentPath = context.url.pathname;

  const isPublicRoute = matcher.public.some((route) =>
    pathToRegexp(route).regexp.test(currentPath)
  );
  const isProtectedRoute = matcher.protected.some((route) =>
    pathToRegexp(route).regexp.test(currentPath)
  );
  const isObservedRoute = matcher.observed.some((route) =>
    pathToRegexp(route).regexp.test(currentPath)
  );

  if (!isPublicRoute && !isProtectedRoute && !isObservedRoute) {
    return next();
  }

  if (isPublicRoute) {
    if (currentPath === "/") {
      const req = new Request(new URL(cachedTemplatePath, context.url), {
        headers: {
          "x-redirect-to": context.url.pathname,
        },
      });

      return next(req);
    }
  } else if (isProtectedRoute) {
    const sessionCookie = context.cookies.get("__session")?.value;
    if (!sessionCookie) return context.redirect("/login");

    try {
      const auth = getAuth(app);
      const decodedCookie = await auth.verifySessionCookie(sessionCookie);
      // @ts-ignore
      context.locals.user = await auth.getUser(decodedCookie.uid);
    } catch (error) {
      return context.redirect("/login");
    }
  } else if (isObservedRoute) {
    if (currentPath === "/tracking-pixel.png") {
      const client_id = context.url.searchParams.get("client_id");
      if (!client_id) return new Response("", { status: 200 });

      const userRef = db.collection("phishingUsers").doc(client_id);
      await userRef.update({
        "status.emailOpened": true,
      });

      return new Response("", { status: 200 });
    }

    return next();
  }

  return next();
});
