# 📱 SmartSpend Sync — Android Bank SMS Companion App

**SmartSpend Sync** is a lightweight, background Android companion app that automatically listens for incoming bank transaction SMS messages on your phone (SBI, HDFC, ICICI, Axis, Kotak, etc.) and forwards them securely to your SmartSpend Flow server.

---

## ⚡ How It Works

```
[Bank SMS Arrives] ➔ [SmsReceiver Filters Bank & Transaction Keywords]
                         │
                         ▼
             [SmsForwarder Background Worker]
                         │
                         ▼ (HTTP POST)
   https://budget.aurumgold.co.in/api/webhook/bank-sms
                         │
                         ▼
        [SmartSpend AI Backend Parses & Records Expense]
```

---

## 🛠️ How to Build the APK

### Method 1: Using Android Studio (Recommended)
1. Open **Android Studio**.
2. Select **File ➔ Open** and choose the `d:\budget_track\android-companion` folder.
3. Wait for Gradle sync to complete.
4. Click **Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)**.
5. Once built, Android Studio will display a pop-up: *"APK(s) generated successfully"*. Click **locate** to view `app-debug.apk`.

### Method 2: Using Command Line (Terminal)
Open PowerShell inside `d:\budget_track\android-companion`:
```powershell
cd d:\budget_track\android-companion
.\gradlew assembleDebug
```
The output APK file will be located at:
`android-companion/app/build/outputs/apk/debug/app-debug.apk`

---

## 📲 How to Install & Configure on Your Phone

### Step 1: Transfer and Install
* **Option A (via USB/ADB):** Connect your phone via USB with USB debugging enabled, then run:
  ```powershell
  adb install d:\budget_track\android-companion\app\build\outputs\apk\debug\app-debug.apk
  ```
* **Option B (Direct):** Send `app-debug.apk` to yourself via WhatsApp, Telegram, or Google Drive. Tap the file on your phone and tap **Install** (allow "Install from Unknown Sources" if prompted).

### Step 2: Open and Grant Permissions
1. Open **SmartSpend Sync**.
2. When prompted, tap **Allow** for **SMS permissions** (so the app can intercept incoming bank alerts).
3. If on Android 13+, tap **Allow** for **Notifications** (needed for the 24/7 background service).

### Step 3: Disable Battery Optimization (Critical for 24/7 Sync)
1. In the app, tap the **"24/7 Battery Fix"** button.
2. Select **"Don't Optimize" / "Unrestricted"**.
3. *(Alternative on Xiaomi/Samsung/OnePlus):* Go to **Phone Settings ➔ Apps ➔ SmartSpend Sync ➔ Battery ➔ Unrestricted**, and enable **Autostart**.

### Step 4: Test Connection
1. Tap the **"Send Test SMS"** button.
2. The app sends a simulated SBI bank debit SMS to `https://budget.aurumgold.co.in/api/webhook/bank-sms`.
3. You will see a toast notification: `Success! 200 OK` and a new log entry will appear in the app's history.
4. Check your live web dashboard at **[budget.aurumgold.co.in](https://budget.aurumgold.co.in)** to confirm the transaction recorded!

---

## 🛡️ Privacy & Security
* **Zero Cloud Intermediaries:** Messages go directly from your phone to your personal Cloud VPS server over HTTPS encryption.
* **Smart Filtering:** Personal messages from friends, family, or OTPs are completely ignored; only verified Indian banking DLT headers with transaction keywords are forwarded.
