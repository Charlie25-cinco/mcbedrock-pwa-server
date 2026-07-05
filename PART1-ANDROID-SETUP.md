# Part 1: PocketMine-MP Server on Android (Termux)

## Prerequisites

- Android phone
- F-Droid app installed (from https://f-droid.org)
- A second device (same WiFi) to test joining the server
- WiFi connection

---

## 1. Install Termux & Termux:Boot

1. Open F-Droid
2. Search for **Termux** and install it
3. Also install **Termux:Boot** (for auto-start on reboot later)

> **Why F-Droid, not Play Store?** The Play Store version of Termux is outdated and no longer maintained. F-Droid has the current version.

---

## 2. Open Termux and update packages

Open the Termux app. Run:

```bash
pkg update && pkg upgrade -y
```

If it asks any questions, type `Y` and press Enter.

---

## 3. Install PHP and required extensions

```bash
pkg install php php-sockets php-mbstring php-bcmath -y
```

---

## 4. Install additional tools

```bash
pkg install wget curl screen -y
```

`screen` lets the Minecraft server keep running when you close Termux (or switch apps).

---

## 5. Create the server folder

```bash
mkdir -p ~/mcserver
cd ~/mcserver
```

All server files will live in `~/mcserver`. To move servers to a different device later, copy this entire folder.

---

## 6. Download PocketMine-MP

```bash
wget https://github.com/pmmp/PocketMine-MP/releases/latest/download/PocketMine-MP.phar
```

If `wget` fails, try:

```bash
curl -L -o PocketMine-MP.phar https://github.com/pmmp/PocketMine-MP/releases/latest/download/PocketMine-MP.phar
```

---

## 7. Run the PocketMine-MP installer

```bash
php PocketMine-MP.phar
```

This will:
- Extract files into `~/mcserver/`
- Ask you to accept the license (type `Y` and press Enter)
- Create the `server.properties` and other config files
- Start the server for the first time

Let it run until you see the server console prompt (`>`), then type:

```
stop
```

This shuts down the server so we can edit config.

---

## 8. Configure server settings

Edit the config file:

```bash
nano server.properties
```

Find and change these lines:

```
gamemode=0
difficulty=1
max-players=8
```

- `gamemode=0` = Survival
- `difficulty=1` = Easy. Change to `2` for Normal or `3` for Hard
- `max-players=8` — conservative for a phone. Lower to 5 if you want, or raise to 10-15 if you're just testing

Also ensure `online-mode=true` stays on (prevents unauthenticated players joining unless you know what you're doing).

**Save and exit nano**: `Ctrl+X`, then `Y`, then `Enter`.

---

## 9. Test the server locally

Start the server again:

```bash
php PocketMine-MP.phar
```

Wait 10-30 seconds until you see a `>` prompt (this means the server is fully loaded).

**On a second device connected to the same WiFi:**
- Open Minecraft Bedrock Edition
- Go to **Play > Servers > Add Server**
- Server name: anything (e.g., "My Server")
- Server address: your phone's local IP (see below)
- Port: `19132`

**To find your phone's local IP:**
In another Termux session (open a new Termux tab/session), run:

```bash
ip -4 a | grep inet
```

Look for something like `192.168.x.x` — that's your local IP. Share that address.

If it connects, **Part 1 local setup is done**. Go to step 10 for external access.

If it doesn't connect, check:
- Both devices are on the same WiFi
- `server.properties` has `server-port=19132` (the default)
- `server.properties` has `ip=0.0.0.0` (listen on all interfaces)

---

## 10. Expose the server externally (tunnel)

Your home network blocks incoming connections. You need a tunnel service. Two free options:

### Option A: Playit.gg (recommended — easiest)

Playit.gg creates a public address for your Minecraft server without port forwarding.

1. Install Playit on Termux:

```bash
pkg install playit -y
```

2. Run it:

```bash
playit
```

3. The first time, it will ask you to sign up/link an account. Follow the on-screen link to get a tunnel address. It will print a `playit.gg` address (e.g., `something.playit.gg:12345`). **Save this address** — it's your permanent public server address.

4. Leave Playit running alongside your server. Use `screen` to manage both:

```bash
# In one screen session, start the server
cd ~/mcserver
screen -S minecraft
php PocketMine-MP.phar
# Ctrl+A, then D to detach (server keeps running)

# In another session, start Playit
screen -S playit
playit
# Ctrl+A, then D to detach
```

### Option B: ngrok

Playit.gg is simpler for Minecraft specifically. I recommend Option A.

---

## 11. Keep Termux alive (critical on Android)

Android aggressively kills background apps. To keep the server running:

### Disable battery optimization

- Go to **Settings > Apps > Termux > Battery** (or **Settings > Battery > App battery management**)
- Set Termux to **Unrestricted** (not Optimized / Restricted)

### Use `termux-wake-lock`

Inside Termux, before starting the server:

```bash
termux-wake-lock
```

This tells Android to keep the phone awake. Run this **each time** you start a server session.

### Manage sessions with `screen`

After detaching from a screen session (`Ctrl+A, D`), you can:

- **Reattach**: `screen -r minecraft`
- **List sessions**: `screen -ls`
- **Kill a session**: reattach then type `exit`

---

## 12. Auto-start server on phone reboot (optional, with Termux:Boot)

1. Create a startup script:

```bash
mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-server.sh
```

2. Add this content:

```bash
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/mcserver
screen -dmS minecraft php PocketMine-MP.phar
```

3. Make it executable:

```bash
chmod +x ~/.termux/boot/start-server.sh
```

Now the server starts automatically when you reboot your phone (as long as Termux:Boot is installed).

---

## Summary of your server

| Item | Value |
|------|-------|
| Server folder | `~/mcserver/` |
| Start command | `cd ~/mcserver && screen -S minecraft php PocketMine-MP.phar` |
| Gamemode | Survival |
| Difficulty | Easy (change in `server.properties`) |
| Max players | 8 (change in `server.properties`) |
| Local port | 19132 |
| External tunnel | Playit.gg address (from step 10) |

## Moving to a different device later

To switch hosts:
1. Copy the entire `~/mcserver/` folder to the new device
2. Install PHP on the new device (steps differ per OS)
3. Run it — all config, worlds, and plugins come with you

---

**Once your server is running and reachable externally (friends can connect via your Playit.gg address), let me know and we'll move to Part 2 (the Dashboard).**
