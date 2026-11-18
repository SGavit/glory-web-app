import { ref, push, runTransaction, set, get } from "firebase/database";
import { buildSongPayload } from "./songData";

const makeOperationId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    return (char === "x" ? random : ((random & 3) | 8)).toString(16);
  });
};

/**
 * Atomically reserves the next catalogue number.
 *
 * The initial high-water mark is read from the existing song collection so
 * older catalogues keep their current numbering. The transaction serializes
 * concurrent CMS allocations at appConfig/songNumberCounter. Failed song
 * saves may leave gaps; numbers are never reused.
 */
export async function allocateNextSongNo(database) {
  const songsSnapshot = await get(ref(database, "songs"));
  const songs = songsSnapshot.val() || {};
  const highestExisting = Object.values(songs).reduce((max, song) => {
    const value = Number(song?.songNo);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const counterRef = ref(database, "appConfig/songNumberCounter");
  const result = await runTransaction(counterRef, current => {
    const currentNumber = Number(current);
    const highWaterMark = Number.isFinite(currentNumber)
      ? Math.max(currentNumber, highestExisting)
      : highestExisting;
    return Math.floor(highWaterMark) + 1;
  }, { applyLocally: false });

  if (!result.committed || !Number.isInteger(Number(result.snapshot.val()))) {
    throw new Error("Could not reserve a unique song number. Please try again.");
  }
  return Number(result.snapshot.val());
}

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

  return { songId: targetId, song: committedSong, operationId, replayed: false };
}
