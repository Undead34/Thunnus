import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { app } from "@/firebase/server";
import type { APIRoute } from "astro";

const db = getFirestore(app);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { userIds, tags, action } = data; // action: "add" | "remove"

    // Validate base inputs
    const isGlobal =
      action === "global_rename" ||
      action === "global_delete" ||
      action === "batch_process";
    if (!isGlobal) {
      if (
        !userIds ||
        !Array.isArray(userIds) ||
        !tags ||
        !Array.isArray(tags)
      ) {
        return new Response(JSON.stringify({ error: "Invalid data" }), {
          status: 400,
        });
      }
    }

    const usersRef = db.collection("phishingUsers");

    // Standard single/multi user update
    if (action === "add" || action === "remove") {
      await db.runTransaction(async (transaction) => {
        const userDocs = await Promise.all(
          userIds.map((id: string) => transaction.get(usersRef.doc(id)))
        );

        userDocs.forEach((doc) => {
          if (!doc.exists) return;

          const userData = doc.data();
          const currentTags: { name: string; color: string }[] =
            userData?.tags || [];
          let newTags = [...currentTags];

          tags.forEach((tagObj: { name: string; color: string }) => {
            if (action === "remove") {
              // Remove by name
              newTags = newTags.filter((t) => t.name !== tagObj.name);
            } else {
              // Add (avoid duplicates by name, update color if exists)
              const existingIndex = newTags.findIndex(
                (t) => t.name === tagObj.name
              );
              if (existingIndex >= 0) {
                newTags[existingIndex] = tagObj; // Update color
              } else {
                newTags.push(tagObj);
              }
            }
          });

          transaction.update(doc.ref, { tags: newTags });
        });
      });
    }

    // Global actions
    if (action === "global_rename" || action === "global_delete") {
      const { oldTagName, newTag } = data; // newTag is { name, color } for rename
      const snapshot = await usersRef.get();
      const batch = db.batch();
      let operationCount = 0;

      snapshot.docs.forEach((doc) => {
        const userData = doc.data();
        const currentTags: { name: string; color: string }[] =
          userData.tags || [];

        const tagExists = currentTags.some((t) => t.name === oldTagName);
        if (!tagExists) return;

        let newTags = [...currentTags];

        if (action === "global_delete") {
          newTags = newTags.filter((t) => t.name !== oldTagName);
        } else if (action === "global_rename") {
          newTags = newTags.map((t) => {
            if (t.name === oldTagName) {
              return newTag; // params: { name: string, color: string }
            }
            return t;
          });
        }

        batch.update(doc.ref, { tags: newTags });
        operationCount++;
      });

      if (operationCount > 0) {
        await batch.commit();
      }
    }

    // Batch Process Action
    if (action === "batch_process") {
      const { operations } = data; // { type: 'rename' | 'delete', oldName: string, newTag?: ... }[]
      if (!operations || !Array.isArray(operations)) {
        return new Response(JSON.stringify({ error: "Invalid operations" }), {
          status: 400,
        });
      }

      const snapshot = await usersRef.get();
      const batch = db.batch();
      let operationCount = 0;

      snapshot.docs.forEach((doc) => {
        const userData = doc.data();
        let currentTags: { name: string; color: string }[] =
          userData.tags || [];
        let modified = false;

        // Apply all operations in sequence
        operations.forEach((op: any) => {
          if (op.type === "delete") {
            const initialLength = currentTags.length;
            currentTags = currentTags.filter((t) => t.name !== op.oldName);
            if (currentTags.length !== initialLength) modified = true;
          } else if (op.type === "rename") {
            // Rename: update name/color, but also need to handle merging if new name already exists
            const tagIndex = currentTags.findIndex(
              (t) => t.name === op.oldName
            );
            if (tagIndex >= 0) {
              const targetName = op.newTag.name;
              // Check if user already has the target tag (merge scenario)
              const existingTargetIndex = currentTags.findIndex(
                (t) => t.name === targetName
              );

              if (
                existingTargetIndex >= 0 &&
                existingTargetIndex !== tagIndex
              ) {
                // Merge: remove old, update existing target's color
                currentTags[existingTargetIndex] = op.newTag;
                currentTags.splice(tagIndex, 1);
              } else {
                // Just rename/recolor in place
                currentTags[tagIndex] = op.newTag;
              }
              modified = true;
            }
          }
        });

        if (modified) {
          batch.update(doc.ref, { tags: currentTags });
          operationCount++;
        }
      });

      if (operationCount > 0) {
        await batch.commit();
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};
