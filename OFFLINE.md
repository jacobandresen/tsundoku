# Running Tsundoku Without WiFi

You can use Tsundoku on your phone without a WiFi network by connecting your phone to your PC via a USB cable. This is called **USB port forwarding** (Android) or **USB tethering**.

---

## Android (USB Cable)

Android's `adb` tool lets your phone reach a port on your PC through the cable, as if it were `localhost`.

### One-time setup

1. On your Android phone, enable **Developer Options**:
   - Settings → About Phone → tap *Build number* 7 times.

2. Enable **USB debugging**:
   - Settings → Developer Options → USB debugging → On.

3. Install ADB on your PC if you don't have it:
   - **macOS**: `brew install android-platform-tools`
   - **Windows**: Download from [developer.android.com/tools/releases/platform-tools](https://developer.android.com/tools/releases/platform-tools)

4. Connect the phone with the USB cable. Accept the "Allow USB debugging?" prompt on your phone.

5. Verify the phone is visible:
   ```
   adb devices
   ```
   You should see a device listed (not "unauthorized").

### Every time you want to use the app

```bash
# 1. Forward PC port 3000 to phone port 3000
adb reverse tcp:3000 tcp:3000

# 2. Start the Tsundoku server on your PC
pnpm --filter server start

# 3. Open Chrome on your phone and go to:
#    http://localhost:3000
```

The phone connects to itself on port 3000, which ADB tunnels through the cable to port 3000 on your PC. No WiFi needed.

> **Tip:** Add `http://localhost:3000` to your Android home screen:
> Chrome menu (⋮) → *Add to Home screen*.

---

## iPhone (USB Cable)

iOS doesn't support ADB, but you can use **iproxy** (part of `libimobiledevice`) or simply start a **personal hotspot** and connect your PC to it.

### Option A — Personal Hotspot (simplest, no extra software)

1. On iPhone: Settings → Personal Hotspot → Allow Others to Join → On.
2. Connect your PC to the iPhone's hotspot via WiFi.
3. Start the server and connect as you would on WiFi.
   The phone's IP on the hotspot is `172.20.10.1` — your PC gets an address like `172.20.10.2`.
4. Find your PC's hotspot IP: `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows).
5. Open `http://<PC-IP>:3000` in Safari on your iPhone.

### Option B — USB Reverse Tunnel with iproxy

```bash
# Install libimobiledevice (macOS)
brew install libimobiledevice

# Trust your Mac on the phone (accept the prompt on iPhone)

# Forward PC port 3000 ↔ iPhone port 3000
iproxy 3000 3000 &

# Start the server
pnpm --filter server start

# Open http://localhost:3000 in Safari on the iPhone
```

> **Note:** iOS Safari on `localhost` is not the same origin as a real hostname.
> If you hit issues, use the Personal Hotspot option instead.

---

## Verify it's working

The server's discovery page tells you what's running:

```
http://localhost:3000/_discover
```

It shows the QR code, your PC's LAN IP, and the USB instructions.

---

## Quick Reference

| Platform | Command | Then open on phone |
|----------|---------|--------------------|
| Android  | `adb reverse tcp:3000 tcp:3000` | `http://localhost:3000` in Chrome |
| iPhone   | Personal Hotspot | `http://<PC-IP>:3000` in Safari |
| iPhone   | `iproxy 3000 3000` | `http://localhost:3000` in Safari |
| Both (WiFi) | *(none)* | `http://<PC-IP>:3000` or scan QR at `/_discover` |
