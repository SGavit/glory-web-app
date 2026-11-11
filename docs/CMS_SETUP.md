# Glory Web Portal & Admin CMS

The web app keeps the existing Create React App + React 19 + Firebase 11 stack. It uses HashRouter so public pages and admin routes work on GitHub Pages without server-side rewrite configuration.

## Routes

- /#/ — public worship library
- /#/song/:id — public song reader
- /#/setlist/:shareId — shared setlist reader
- /#/login — Google or email/password sign-in
- /#/admin/dashboard — admin overview
- /#/admin/songs — song catalogue
- /#/admin/songs/new — create song
- /#/admin/songs/:id/edit — metadata, lyrics and chord editor
- /#/admin/songs/:id/history — version snapshots
- /#/admin/reports — correction queue
- /#/admin/taxonomy — categories and languages
- /#/admin/users — user role management
- /#/admin/announcements — announcements
- /#/admin/settings — daily verse and connection summary

## Local development

```bash
npm ci
npm start
```

Build verification:

```bash
npm run build
```

## Firebase configuration

The current client config points to the existing glory-68505 project and existing Realtime Database. Do not replace the database or rename existing nodes as part of this web rollout.

In Firebase Authentication, enable only the sign-in providers intended for the project (Google and Email/Password are used by the sign-in screen). Add the deployed GitHub Pages domain to Authentication > Settings > Authorized domains.

The CMS reads the existing paths:
- songs/$songId
- songVersions/$songId/$version
- reports/$reportId
- roles/$uid
- users/$uid
- dailyVerse
- sharedSetlists/$shareId

It writes song records and version snapshots, report status changes, taxonomy under appConfig/categories and appConfig/languages, user role updates, announcements under announcements/$id, and the daily verse under dailyVerse.

## CMS role model

The CMS recognizes four roles. The role stored at `roles/{uid}/role` is authoritative; a legacy `users/{uid}/role` profile field is not used to grant CMS access.

| Role | CMS capabilities |
| --- | --- |
| `SUPER_ADMIN` | Full CMS access, People & roles, role assignment, settings, announcements, taxonomy, song publishing and report resolution. |
| `ADMIN` | Operational administration: songs, publishing, archiving, taxonomy, reports, announcements and operational settings. Cannot manage roles. |
| `CONTENT_MANAGER` | Read, create and edit songs, and access the correction queue. Cannot publish/archive songs, manage roles, taxonomy, announcements or settings. |
| `USER` | No CMS workspace access; uses public app features and own account data. |

Only a SUPER_ADMIN can assign `ADMIN`, `CONTENT_MANAGER` or `USER`. The People & roles route and navigation item are restricted to SUPER_ADMIN. The current SUPER_ADMIN row and the signed-in account are displayed as locked in the role editor.

### Realtime Database role-rule requirements

The following is a focused rule fragment for the existing shared database, not a complete replacement for the production rules. Merge it into the current ruleset while preserving the existing song, report, favorites, setlist, notification and Android-specific paths:

```json
{
  "users": {
    ".read": "auth != null && root.child('roles').child(auth.uid).child('role').val() == 'SUPER_ADMIN'",
    "$uid": {
      ".read": "auth != null && auth.uid == $uid",
      ".write": "auth != null && auth.uid == $uid"
    }
  },
  "roles": {
    ".read": "auth != null && root.child('roles').child(auth.uid).child('role').val() == 'SUPER_ADMIN'",
    "$uid": {
      ".read": "auth != null && (auth.uid == $uid || root.child('roles').child(auth.uid).child('role').val() == 'SUPER_ADMIN')",
      ".write": "auth != null && root.child('roles').child(auth.uid).child('role').val() == 'SUPER_ADMIN' && auth.uid != $uid",
      "role": {
        ".validate": "newData.isString() && (newData.val() == 'USER' || newData.val() == 'ADMIN' || newData.val() == 'CONTENT_MANAGER')"
      }
    }
  }
}
```

Bootstrap the first SUPER_ADMIN manually through a trusted Firebase Console/owner process at `roles/{your-auth-uid}/role = "SUPER_ADMIN"`. Do not bootstrap it through the website. The fragment assumes role records use the object form `{ "role": "ADMIN", "updatedAt": 123, "updatedBy": "uid" }`. A legacy string role can be read by the CMS, but role writes from the CMS use the object form.

The CMS now resolves authority only from `roles/{uid}`; it no longer trusts a role copied into the user's editable profile. This matters because users can write their own `users/{uid}` profile in the existing Android-compatible model.

**Important limitation:** Realtime Database grants are additive down the tree. The existing `songs/{songId}/.write` rule that grants both ADMIN and CONTENT_MANAGER access also grants those managers permission to change every field in that song, including status/visibility. Hiding the Publish button in React is not sufficient to secure publishing. Before enforcing the review workflow, change the song write architecture/rules (or use a trusted Cloud Function) so only ADMIN/SUPER_ADMIN can change publication status and visibility.

## Production security checklist — required before launch

1. Review the live RTDB rules against every path above. Do not deploy permissive rules.
2. Ensure role assignment is enforced by database rules or trusted server code. Client-side role checks only hide UI; they are not a security boundary.
3. Bootstrap the first ADMIN/SUPER_ADMIN role using a trusted owner process. Do not let users assign their own roles.
4. Verify that user-role data is consistent with the Android app's role parser.
5. Test song writes against the Android app and verify sections, lines, chords, charIndex, status, visibility, version, and timestamps.
6. Verify report field names/status values against actual Android SongReport serialization before resolving production reports.
7. Push notifications are not sent directly from the browser. Add a trusted Cloud Function/FCM workflow if announcements must trigger push delivery.
8. Confirm existing Firebase Auth providers, authorized domains, and RTDB rules before deploying.

## Compatibility notes

- Song lyrics are parsed from section headings such as [Verse 1], [Chorus], and [Bridge].
- The CMS editor uses Android-style section cards and chord workspace controls: select a chord, click a lyric position, drag chord labels, edit/delete, undo/redo, lock, clear with confirmation, and preview.\n- Auto-detection accepts complete lyrics: explicit bracket headings create named sections; without headings, blank-line-separated blocks become numbered verses.\n- Chords are serialized into Android-compatible line chord objects with zero-based UTF-16 `charIndex`; inline `{G}` / `{Em}` markers are used only as an internal editing serialization and are removed from saved lyric text.
- Editing uses a Realtime Database transaction with a version check to avoid silently overwriting another editor's newer song revision.
- A version snapshot is written to songVersions after a successful save.
- Archive is a status/visibility change, not a hard delete.
- This first CMS delivery is a working foundation. Validate Firebase rules and data contracts against the live Android implementation before using administrative writes in production.
