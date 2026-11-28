package com.aurumgold.smartspend.sync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val sender = messages[0].displayOriginatingAddress ?: messages[0].originatingAddress ?: "Unknown"
            val timestamp = messages[0].timestampMillis

            // Reconstruct full message if segmented
            val fullBody = StringBuilder()
            for (sms in messages) {
                fullBody.append(sms.displayMessageBody ?: sms.messageBody ?: "")
            }
            val body = fullBody.toString().trim()

            Log.d("SmsReceiver", "Received SMS from $sender: $body")

            // Filter for Bank / Financial transaction SMS
            if (BankFilter.isBankSms(sender, body)) {
                Log.i("SmsReceiver", "Matched Bank SMS! Forwarding to SmartSpend Flow...")
                SmsForwarder.forwardSms(
                    context = context,
                    sender = sender,
                    body = body,
                    timestamp = timestamp
                )
            } else {
                Log.d("SmsReceiver", "Ignored non-bank SMS from $sender")
            }

        } catch (e: Exception) {
            Log.e("SmsReceiver", "Error processing incoming SMS", e)
        }
    }
}
