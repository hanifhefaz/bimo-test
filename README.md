# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Weekly leaderboards

The `Top Games (weekly)` and `Top Redeemers` leaderboards rely on `gamesPlayedWeekly` and `redeemsThisWeek` counters stored on each
user document. These values are **not** automatically cleared by Firestore – the app expects them to be reset once per week so that the
leaderboards reflect activity from the current 7‑day period.

There are two mechanisms for keeping the counters fresh:

1. **Scheduled backend task** (recommended)
   - Add a Cloud Function or other scheduled job that calls `resetWeeklyLeaderboard()` from
     `src/lib/firebaseOperations.ts` every Monday (or whenever you consider the week to start).
   - Use [Cloud Scheduler](https://cloud.google.com/scheduler) or Cron to hit the HTTP function or invoke it directly from
     the Firebase Admin SDK.
   - Example (Node.js cloud function):
     ```ts
     import * as functions from 'firebase-functions';
     import { resetWeeklyLeaderboard } from './path/to/firebaseOperations';

     export const weeklyReset = functions.pubsub
       .schedule('every monday 00:00')
       .timeZone('UTC')
       .onRun(async () => {
         await resetWeeklyLeaderboard();
       });
     ```

2. **Client-side fallback**
   - On every login/profile fetch the client checks `lastWeeklyReset` and automatically zeroes counters
     if more than seven days have elapsed. This keeps individual users up‑to‑date even if the scheduled job
     fails or has not yet run.

> ⚠️ If neither mechanism is in place the leaderboard values will continue to accumulate indefinitely and
> the weekly dashboard will appear stale. Make sure you deploy the scheduled function and/or publish a
> configuration that triggers the reset.


### Sliding 7‑day leaderboards (alternative approach)

For a **rolling** seven‑day window you don't need any resets at all. Instead:

* Each time a game is played or a code is redeemed we write a small document to
  `gameEvents` or `redeemEvents` with the `userId` and a server timestamp.
* The client (or a backend job) can run `getTopUsersLast7Days('game', 5)` /
  `getTopUsersLast7Days('redeem', 5)` from `src/lib/firebaseOperations.ts` which
  queries events from the past week and tallies counts in memory.
* For high‑traffic apps it's smarter to compute the leaderboard once per day and
  store the results in a `leaderboards/weekly` collection; the helpers above make
  it easy to build such a job.

This is the approach now used by `LeaderboardsPage.tsx` – headers were updated to
reflect "last 7 days" and the logic will always show the most recent week rather
than relying on periodic resets. You can still keep the weekly counters if you
like; they provide a simpler, cheaper leaderboard for low‑volume apps.

> **Security rules reminder:**
> The event collections (`gameEvents`, `redeemEvents`) are read by the
> client whenever the sliding‑window leaderboard is displayed.  In addition,
> every game play or redeem action attempts to **write** a document into the
> corresponding collection.  If your Firestore rules deny those writes the
> app will log errors like:
>
> ```text
> Failed to log event to gameEvents for <user>: FirebaseError: Missing or
> insufficient permissions.
> ```
>
> The sample `firestore.rules` file in this repo includes permissive rules
> for both collections:
>
> ```
> match /gameEvents/{eventId} {
>   allow read: if isSignedIn();
>   allow create: if isSignedIn()
>                 && request.resource.data.userId == request.auth.uid
>                 && request.resource.data.timestamp is timestamp;
>   allow update, delete: if false;
> }
> match /redeemEvents/{eventId} {
>   allow read: if isSignedIn();
>   allow create: if isSignedIn()
>                 && request.resource.data.userId == request.auth.uid
>                 && request.resource.data.timestamp is timestamp;
>   allow update, delete: if false;
> }
> ```
>
> Adjust the conditions to suit your needs (e.g. restrict read access to
> admins and call a cloud function) but make sure the write rule permits the
> client code to add events, otherwise the sliding window queries will always
> fall back to the older static counters.

",

## Voucher Cards (Admin)

- Admins can now generate secure 14-digit voucher codes for printing. Codes are stored hashed in Firestore and the plaintext codes are returned once for printing.
- Admins can export/print voucher cards with a simple printable layout (use browser Print → Save as PDF for PDF export).
- Users can redeem voucher codes from **Profile → Account** under **Redeem Voucher** to add credits to their account. Vouchers are marked as used after redemption and a transaction is recorded.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## Firebase Storage CORS (important for local uploads)

If you encounter browser CORS errors when uploading images (e.g., "Response to preflight request doesn't pass access control check"), configure your Firebase Storage bucket's CORS to allow your app origin (for local dev, typically `http://localhost:8080` or `http://localhost:3000`).

Example `cors.json`:

```json
[
  {
    "origin": ["http://localhost:8080", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable", "x-goog-api-client", "X-Requested-With"],
    "maxAgeSeconds": 3600
  }
]
```

Apply it using `gsutil`:

```sh
# Authenticate with gcloud and enable the storage APIs
gcloud auth login
# Then apply the CORS policy (replace with your bucket name)
gsutil cors set cors.json gs://social-spark-adfa5.appspot.com
```

Or use the Google Cloud Console: Storage → Buckets → Select your bucket → Configure CORS.

After updating CORS, reload the app and try the upload again.
