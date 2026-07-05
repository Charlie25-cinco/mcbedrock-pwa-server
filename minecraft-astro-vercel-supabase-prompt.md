# Project: Portable PocketMine-MP Bedrock Server + Astro/Vercel/Supabase Control Dashboard

## Goal
Set up a Minecraft Bedrock server (via PocketMine-MP) that I can host from **whichever device I have on hand** — Windows PC, Mac, Linux machine, or Android phone (via Termux) — without being locked into one specific device long-term. Then build a dashboard (Astro, deployed on Vercel, using Supabase for auth and state) that lets me start/stop/monitor the server from any device, regardless of which device is currently acting as the host.

## Core requirement: device-agnostic setup
- PocketMine-MP runs on PHP, which is available on Windows, Mac, Linux, and Android (via Termux) — so the underlying server software doesn't change between devices, only the installation steps and OS-specific quirks do
- Please structure the setup so that:
  1. You first ask me which device I'm currently setting up on
  2. You give me the correct PHP/PocketMine-MP install steps for that specific device
  3. The actual PocketMine-MP server files, world data, and configuration are kept in a way that's easy to copy/move to a different device later (e.g. a single self-contained folder), so if I switch from phone to PC (or vice versa), I'm not starting from scratch — just copying the server folder over and reinstalling PHP on the new device
- Do not assume Termux/Android as the permanent host. Ask me at the start of each new setup session which device I'm using right now, since it may change between sessions

## My general environment
- Devices I might use to host: Windows PC, Android phone (Termux via F-Droid — not Play Store)
- Edition: Minecraft Bedrock (cross-platform by design — friends should be able to join from desktop, tablet, mobile, or console, since Bedrock supports all of these natively once the server is reachable, regardless of what device is hosting)
- Server software: PocketMine-MP (PHP-based, chosen for beginner-friendliness and plugin support)
- Networking: server needs to be reachable from outside my home network — assume I'll need help with port forwarding or a tunnel service (e.g. ngrok, Playit.gg) each time, since the specific setup may differ slightly per device/OS
- Experience level: total beginner with Java/PHP, command line, and server administration — please explain each step, don't assume prior knowledge, and check for errors after each command before moving to the next
- Frontend experience note: I've used Astro before (on an unrelated school project), so Astro-specific syntax/concepts don't need to be over-explained, but treat everything else (Vercel deploys, Supabase setup, the server/networking side) as new to me

## Dashboard stack: Astro + Vercel + Supabase
- **Astro**: build the dashboard UI as an Astro site. Use an Astro island (React, Svelte, or vanilla JS component — your call, keep it simple) for the interactive parts (status display, start/stop buttons, log viewer), since those need client-side reactivity while the rest of the page can stay static
- **Vercel**: deploy the Astro site here (free tier). Straightforward static/SSR hosting, HTTPS by default
- **Supabase**: used for two things only — NOT for running or controlling the Minecraft server itself:
  1. **Auth** — use Supabase Auth so I log into the dashboard properly (email/password or magic link, simplest option is fine) instead of a hand-rolled token check
  2. **State/status storage** — a small Supabase table (e.g. `server_status`) that stores things like: current tunnel URL, last-known server status (on/off), player count, recent log lines, last-updated timestamp. The device currently hosting the server pushes updates into this table (via a small script/cron on that device); the dashboard reads from Supabase (optionally using Supabase Realtime subscriptions to update live) instead of polling my phone/PC directly for status
- **Important architectural boundary**: Supabase cannot execute start/stop/restart commands on my phone or PC — it's a database, not a remote execution platform. Actual control actions (start/stop/restart) must still be sent directly from the dashboard to whichever device is hosting, via that device's tunnel URL and its own small local control API (same as before). Supabase is for auth + reflecting status, not for issuing commands. Please don't build something that assumes Supabase can trigger actions on my phone — flag clearly if this distinction gets blurry at any point
- The dashboard should let me update the current host's tunnel URL from within the UI (store it in Supabase), so switching which device is hosting doesn't require redeploying the Astro site

## Part 1: Get the base server running on whichever device I'm using (do this first, fully, before Part 2)
1. Ask me which device I'm setting up on right now (Windows / Mac / Linux / Android)
2. Give me the correct steps for that device:
   - **Windows**: install PHP directly (no Termux needed), download PocketMine-MP, run it
   - **Android**: install Termux via F-Droid, install PHP inside Termux, download PocketMine-MP, run it
   - **Mac/Linux**: install PHP via the OS's package manager, download PocketMine-MP, run it
3. Keep the PocketMine-MP folder structure the same across devices where possible, so moving the server (world data, config, plugins) from one device to another later is just a folder copy, not a rebuild
4. Get the server starting successfully and confirm it's reachable on the local network first (e.g. joining from a device on the same WiFi)
5. Only then help me expose it externally (port forwarding on my router, or a tunnel service appropriate for that device/OS) so friends outside my network can connect
6. Confirm sensible defaults: reasonable max-players (adjust expectations based on which device is hosting — a phone will handle fewer players than a PC), gamemode, difficulty — ask me for preferences rather than assuming survival/normal if it matters for later steps

## Part 2: Dashboard (only after Part 1 works end-to-end)
Build a lightweight control panel with:
- **Local control API**: a small API (Node.js or PHP — whichever integrates more simply with whichever device is hosting) running alongside the Minecraft server on the current host device, exposing endpoints to:
  - Start the server
  - Stop the server
  - Restart the server
  - Get current status (running/stopped, player count if available)
  - Stream or fetch recent console output/logs
  - All endpoints must require a token/password check, since this API is reachable over the public internet via tunnel
  - Keep this backend's code identical/portable across devices as much as possible — same Node.js or PHP script should run whether the host is Windows, Mac, Linux, or Termux, with only the process-management commands (how to start/stop the actual Minecraft server process) differing per OS
  - Optionally, have this local API also push periodic status updates (on/off, player count, recent logs) into the Supabase `server_status` table, so the dashboard can show status without needing to hit the tunnel URL directly every time
- **Supabase setup**:
  - Set up a Supabase project, walk me through getting the URL/anon key
  - Set up Supabase Auth (simplest approach — email/password or magic link) so only I can log into the dashboard
  - Create a `server_status` table (or similar) to store: tunnel URL, host device label, on/off status, player count, recent log lines, last-updated timestamp
  - Optionally use Supabase Realtime so the dashboard updates live when the table changes, instead of polling
- **Astro dashboard (deployed on Vercel)**:
  - Login page using Supabase Auth
  - Main dashboard page showing: current host device, server status (on/off, players online), recent logs, and start/stop/restart buttons
  - A settings area to update the current host's tunnel URL and auth token (saved to Supabase), so switching which device is hosting doesn't require redeploying the Astro site
  - Start/stop/restart buttons call the local control API directly at its tunnel URL (pulled from Supabase), not through Supabase itself — Supabase only stores/displays state, it doesn't relay commands
  - Responsive layout that works well from small phone screens up through desktop browser windows

## Constraints and things to watch for
- If hosting from Android/Termux: phone will need Termux battery optimization disabled ("unrestricted") and to stay charging/awake — mention this when Android is the current host
- If hosting from Windows/Mac/Linux: that machine needs to stay powered on and not sleep while it's the active host — mention this when applicable
- Explain any risk of the OS killing background processes (Termux, PHP server, the API) and how to mitigate it per-platform (e.g. termux-wake-lock and Termux:Boot on Android; disabling sleep in Windows Power settings; etc.)
- Flag clearly if any step is fragile or OS-specific and likely to need troubleshooting
- No need to worry about production-grade security hardening — this is a personal/friends server — but do warn me if something is a genuinely bad idea (e.g. exposing an unauthenticated control API to the whole internet, or storing secrets in a way that's publicly readable from the deployed Astro site) rather than silently doing it
- Be explicit any time a suggested approach would blur the line between "Supabase stores status" and "Supabase executes commands" — the latter isn't something Supabase does here, and a design that assumes otherwise won't work

## What I want from you as we go
- Walk through this incrementally, one step at a time
- After each command/step, wait for me to confirm it worked (I'll paste output/errors) before continuing
- If something is likely to fail on Android/Termux specifically (vs. a normal Linux server), flag it in advance
- Keep explanations beginner-friendly — I don't have a CS background yet
