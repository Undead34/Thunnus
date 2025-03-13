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

setupFirestoreListener();

interface Matcher {
    public: string[];
    protected: string[];
}

const matcher: Matcher = {
    public: ["/"],
    protected: ["/dashboard/:path", "/dashboard"]
}

// Middleware
export const onRequest = defineMiddleware(async (context, next) => {
    const currentPath = context.url.pathname;

    const isPublicRoute = matcher.public.some((route) => {
        return pathToRegexp(route).regexp.test(currentPath);
    });

    const isProtectedRoute = matcher.protected.some(route => pathToRegexp(route).regexp.test(currentPath));

    if (!isPublicRoute && !isProtectedRoute) {
        return next();
    }

    if (isPublicRoute) {
        if (currentPath === "/") {
            const req = new Request(new URL(cachedTemplatePath, context.url), {
                headers: {
                    "x-redirect-to": context.url.pathname
                }
            });

            return next(req);
        }
    } else {
        const sessionCookie = context.cookies.get("__session")?.value;
        if (!sessionCookie) return context.redirect("/login");

        try {
            const auth = getAuth(app);
            const decodedCookie = await auth.verifySessionCookie(sessionCookie);
            context.locals.user = await auth.getUser(decodedCookie.uid);
        } catch (error) {
            return context.redirect("/login");
        }
    }

    return next();
});
