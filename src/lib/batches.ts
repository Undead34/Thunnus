import { getFirestore, type Timestamp, FieldValue, type UpdateData } from "firebase-admin/firestore";
import { app } from "@/firebase/server";

const db = getFirestore(app);

export interface EmailBatch {
    status: "pending" | "processing" | "completed" | "failed";
    total: number;
    processed: number;
    successes: number;
    failures: number;
    errors: Array<{ userId: string; error: string }>;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface EmailBatchWithId extends EmailBatch {
    id: string;
}

export async function createBatch(userIds: string[]): Promise<string> {
    const batchRef = await db.collection("batches").add({
        status: "pending",
        total: userIds.length,
        processed: 0,
        successes: 0,
        failures: 0,
        errors: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    });

    return batchRef.id;
}

export async function updateBatchProgress(
    batchId: string,
    success: true,
    error?: undefined
): Promise<void>;
export async function updateBatchProgress(
    batchId: string,
    success: false,
    error: { userId: string; message: string }
): Promise<void>;
export async function updateBatchProgress(
    batchId: string,
    success: boolean,
    error?: { userId: string; message: string }
): Promise<void> {
    const batchRef = db.collection("batches").doc(batchId);
    const updates: UpdateData<EmailBatch> = {
        updatedAt: FieldValue.serverTimestamp()
    };

    if (success) {
        updates.processed = FieldValue.increment(1);
        updates.successes = FieldValue.increment(1);
    } else {
        if (!error) throw new Error("Error is required when operation fails");

        updates.processed = FieldValue.increment(1);
        updates.failures = FieldValue.increment(1);
        updates.errors = FieldValue.arrayUnion({
            userId: error.userId,
            error: error.message
        });
    }

    await batchRef.update(updates);
}

export async function updateBatchChunk(
    batchId: string,
    successCount: number,
    failureCount: number,
    errors: Array<{ userId: string; error: string }>
): Promise<void> {
    if (successCount === 0 && failureCount === 0) return;

    const batchRef = db.collection("batches").doc(batchId);
    const updates: UpdateData<EmailBatch> = {
        updatedAt: FieldValue.serverTimestamp(),
        processed: FieldValue.increment(successCount + failureCount),
        successes: FieldValue.increment(successCount),
        failures: FieldValue.increment(failureCount),
    };

    if (errors.length > 0) {
        updates.errors = FieldValue.arrayUnion(...errors);
    }

    await batchRef.update(updates);
}

export async function getBatchStatus(batchId: string): Promise<EmailBatchWithId> {
    const snapshot = await db.collection("batches").doc(batchId).get();

    if (!snapshot.exists) {
        throw new Error("Batch not found");
    }

    const data = snapshot.data() as EmailBatch;

    return {
        id: snapshot.id,
        ...data
    };
}

export async function getBatches() {
    const snapshot = (await db.collection("batches").get()).docs;

    const data = snapshot.map((data) => data.data());

    return data;
}
