import { defineMiddleware } from "astro:middleware";
import { app } from "./firebase/server";
import { getFirestore } from "firebase-admin/firestore";

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

// Middleware
export const onRequest = defineMiddleware(async (context, next) => {
    if (context.url.pathname === "/") {
        const req = new Request(new URL(cachedTemplatePath, context.url), {
            headers: {
                "x-redirect-to": context.url.pathname
            }
        });

        return next(req);
    }

    return next();
});
