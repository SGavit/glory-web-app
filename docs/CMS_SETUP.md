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
- Chord markers entered in the editor as {G} or {Em} are serialized into Android-compatible chord objects with zero-based charIndex; markers are removed from the saved lyric text.
- Editing uses a Realtime Database transaction with a version check to avoid silently overwriting another editor's newer song revision.
- A version snapshot is written to songVersions after a successful save.
- Archive is a status/visibility change, not a hard delete.
- This first CMS delivery is a working foundation. Validate Firebase rules and data contracts against the live Android implementation before using administrative writes in production.
