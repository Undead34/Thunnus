import { defineMiddleware } from "astro:middleware";

import { app } from "./firebase/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

import { pathToRegexp } from "path-to-regexp";
import { parseUserAgent } from "./lib/user-agent";
import { getGeoLocation } from "./lib/geoip";

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
  protected: ["/dashboard", "/dashboard/*path"],
  observed: ["/api/tracking-pixel"],
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
      const country = context.url.searchParams.get("country");
      const client_id = context.url.searchParams.get("client_id");

      // Server-side click tracking
      if (client_id) {
        (async () => {
          try {
            const userRef = db.collection("phishingUsers").doc(client_id);
            const userSnapshot = await userRef.get(); // Check existence first to avoid creating junk docs

            if (userSnapshot.exists) {
              const ip = context.clientAddress || context.request.headers.get("x-forwarded-for") || "unknown";
              const userAgent = context.request.headers.get("user-agent") || "unknown";
              const { os, browser } = parseUserAgent(userAgent);

              await userRef.update({
                "status.linkClicked": true,
                "status.lastActivityAt": new Date(),
                "metadata.ip": ip,
                "metadata.userAgent": userAgent,
                "metadata.device.os": os,
                "metadata.device.browser": browser,
                clickCount: FieldValue.increment(1),
                events: FieldValue.arrayUnion({
                  type: "CLICKED",
                  timestamp: new Date().toISOString(),
                  data: {
                    ip,
                    country: country || "unknown",
                    userAgent
                  }
                })
              });
            }
          } catch (e) {
            console.error("Error logging click in middleware:", e);
          }
        })();
      }

      let templatePath = cachedTemplatePath;

      if (country) {
        const countryMap: Record<string, string> = {
          peru: "/templates/poder-judicial-peru",
          brasil: "/templates/poder-judicial-brasil",
          ecuador: "/templates/funcion-judicial-ecuador",
          "el-salvador": "/templates/corte-suprema-el-salvador",
          colombia: "/templates/rama-judicial-colombia",
        };

        if (countryMap[country]) {
          templatePath = countryMap[country];
        }
      }

      const redirectUrl = new URL(templatePath, context.url);

      // Asegurar que los search params originales se mantengan
      redirectUrl.search = context.url.search;

      const req = new Request(redirectUrl.toString(), {
        headers: {
          "x-redirect-to": context.url.pathname,
        },
      });

      return next(req);
    }
  }
  else if (isProtectedRoute) {
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
    if (currentPath === "/api/tracking-pixel") {
      const client_id = context.url.searchParams.get("client_id");
      if (!client_id) return new Response("", { status: 200 });

      // Get IP and User Agent
      const ip =
        context.clientAddress ||
        context.request.headers.get("cf-connecting-ip") ||
        context.request.headers.get("x-forwarded-for") ||
        context.request.headers.get("x-real-ip");
      const userAgent = context.request.headers.get("user-agent");

      const event = {
        type: "EMAIL_OPENED",
        timestamp: new Date().toISOString(),
        data: {
          ip,
          userAgent,
        },
      };


      const userRef = db.collection("phishingUsers").doc(client_id);
      const docSnapshot = await userRef.get();

      if (docSnapshot.exists) {
        await userRef.update({
          "status.emailOpened": true,
          "status.emailOpenedAt": new Date(),
          "status.lastActivityAt": new Date(),
          events: FieldValue.arrayUnion(event),
        });
      } else {
        console.log(`Intento de tracking ignorado: El usuario con client_id "${client_id}" no existe.`);
      }
    }

    return next();
  }

  return next();
});
