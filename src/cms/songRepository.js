import { ref, push, runTransaction, set } from "firebase/database";
import { buildSongPayload } from "./songData";

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const makeOperationId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
    const random = Math.random() * 16 | 0;
    return (char === "x" ? random : (random & 3 | 8)).toString(16);
  });
};

/**
 * Saves one song with Android-style optimistic version checks.
 * This writes only when explicitly called by the editor; never run at module load.
 */
export async function saveSongToFirebase({ database, songId, existing, edited, uid, changeNote }) {
  if (!uid) throw new Error("A signed-in user is required.");
  if (!String(edited.songTitle || "").trim()) throw new Error("Song title is required.");
  const operationId = makeOperationId();
  const now = Date.now();
  const targetId = songId || push(ref(database, "songs")).key;
  if (!targetId) throw new Error("Could not allocate a song ID.");

  const baseVersion = Number(existing?.version || 0);
  const proposed = buildSongPayload({ ...existing, firebaseKey: targetId }, { ...edited, firebaseKey: targetId }, uid, now, operationId);
  let alreadyApplied = false;

  const transaction = await runTransaction(ref(database, `songs/${targetId}`), current => {
    if (!current) {
      if (baseVersion !== 0) return;
      return proposed;
    }
    const currentVersion = Number(current.version || 0);
    if (currentVersion === proposed.version && sameJson(current, proposed)) {
      alreadyApplied = true;
      return current;
    }
    if (currentVersion !== baseVersion) return;
    // Merge onto the latest remote object so fields unknown to this CMS are retained.
    return { ...current, ...proposed, firebaseKey: targetId, createdAt: current.createdAt || proposed.createdAt };
  }, { applyLocally: false });

  if (!transaction.committed && !alreadyApplied) {
    throw new Error("Version conflict: this song changed after you opened it. Reload the song and reapply your edits.");
  }

  const committedSong = transaction.snapshot.val();
  if (!committedSong) throw new Error("Firebase did not return the saved song.");
  const historyRef = ref(database, `songVersions/${targetId}/${operationId}`);
  await set(historyRef, {
    version: Number(committedSong.version || proposed.version),
    changedBy: uid,
    changedAt: now,
    changeNote: changeNote || (baseVersion === 0 ? "Initial create" : "Updated in CMS"),
    snapshot: committedSong
  });

  return { songId: targetId, song: committedSong, operationId, replayed: alreadyApplied };
}
