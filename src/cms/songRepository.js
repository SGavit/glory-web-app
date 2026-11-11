import { ref, push, runTransaction, set, get } from "firebase/database";
import { buildSongPayload, buildSongIndexPayload } from "./songData";

const makeOperationId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    return (char === "x" ? random : ((random & 3) | 8)).toString(16);
  });
};

/**
 * Saves one song with the Android optimistic version check and version-history format.
 * operationId and preparedAt can be supplied by the caller to retry the same logical save.
 * Writes occur only when explicitly called by the editor.
 */
export async function saveSongToFirebase({
  database, songId, existing, edited, uid, changeNote,
  operationId = makeOperationId(), preparedAt = Date.now()
}) {
  if (!uid) throw new Error("A signed-in user is required.");
  if (!String(edited.songTitle || "").trim()) throw new Error("Song title is required.");

  const targetId = songId || push(ref(database, "songs")).key;
  if (!targetId) throw new Error("Could not allocate a song ID.");
  const baseVersion = Number(existing?.version || 0);
  const proposed = buildSongPayload(
    { ...existing, firebaseKey: targetId },
    { ...edited, firebaseKey: targetId },
    uid,
    preparedAt
  );
  const historyRef = ref(database, `songVersions/${targetId}/${operationId}`);

  // Android first checks whether this operation already wrote a version-history record.
  const previousHistory = await get(historyRef);
  if (previousHistory.exists()) {
    const recordedVersion = Number(previousHistory.child("version").val() || 0);
    if (recordedVersion === proposed.version) {
      const current = await get(ref(database, `songs/${targetId}`));
      const replayedSong = current.val() || previousHistory.child("snapshot").val();
      if (replayedSong) {
        try {
          await set(ref(database, `songIndex/${targetId}`), buildSongIndexPayload(targetId, replayedSong));
        } catch (indexError) {
          console.warn("Song save was already committed, but its catalogue index could not be updated. Rebuild the index from the CMS.", indexError);
        }
      }
      return {
        songId: targetId,
        song: replayedSong,
        operationId,
        replayed: true
      };
    }
    throw new Error("This save operation already exists with a different version. Reload the song before continuing.");
  }

  const transaction = await runTransaction(ref(database, `songs/${targetId}`), current => {
    if (!current) {
      if (baseVersion !== 0) return;
      return proposed;
    }
    const currentVersion = Number(current.version || 0);
    if (currentVersion === proposed.version) {
      // Match Android data-class equality. Firebase omits null-valued properties.
      const matches = Object.keys({ ...current, ...proposed }).every(key =>
        JSON.stringify(current[key] ?? null) === JSON.stringify(proposed[key] ?? null)
      );
      if (matches) return current;
    }
    if (currentVersion !== baseVersion) return;
    return {
      ...current,
      ...proposed,
      firebaseKey: targetId,
      createdAt: current.createdAt || proposed.createdAt,
      createdBy: current.createdBy || proposed.createdBy
    };
  }, { applyLocally: false });

  if (!transaction.committed) {
    throw new Error("Version conflict: this song changed after you opened it. Reload the song and reapply your edits.");
  }

  const committedSong = transaction.snapshot.val();
  if (!committedSong) throw new Error("Firebase did not return the saved song.");

  // Match Android history path and payload. Android writes this after its song transaction.
  await set(historyRef, {
    version: Number(committedSong.version || proposed.version),
    changedBy: uid,
    changedAt: preparedAt,
    changeNote: changeNote || (baseVersion === 0 ? "Initial Create" : "Updated"),
    snapshot: committedSong
  });

  // Keep the lightweight catalogue index in sync without copying lyrics or chords.
  // Index failures must not turn an already-committed song save into a reported failure;
  // an administrator can safely rebuild the index from /songs.
  try {
    await set(ref(database, `songIndex/${targetId}`), buildSongIndexPayload(targetId, committedSong));
  } catch (indexError) {
    console.warn("Song saved, but its catalogue index could not be updated. Rebuild the Song Library index from the CMS.", indexError);
  }

  return { songId: targetId, song: committedSong, operationId, replayed: false };
}
