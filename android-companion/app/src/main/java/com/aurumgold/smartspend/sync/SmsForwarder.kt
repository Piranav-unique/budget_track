package com.aurumgold.smartspend.sync

import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object SmsForwarder {

    private const val TAG = "SmsForwarder"
    const val ACTION_LOGS_UPDATED = "com.aurumgold.smartspend.sync.LOGS_UPDATED"
    private const val PREFS_NAME = "smartspend_sync_prefs"
    private const val KEY_WEBHOOK_URL = "webhook_url"
    private const val KEY_LOGS = "forward_logs"
    private const val DEFAULT_URL = "https://budget.aurumgold.co.in/api/webhook/bank-sms"

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    fun getWebhookUrl(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_WEBHOOK_URL, DEFAULT_URL) ?: DEFAULT_URL
    }

    fun setWebhookUrl(context: Context, url: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_WEBHOOK_URL, url.trim()).apply()
    }

    fun getLogs(context: Context): List<ForwardLog> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_LOGS, null) ?: return emptyList()
        val list = mutableListOf<ForwardLog>()
        try {
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                list.add(ForwardLog.fromJson(arr.getJSONObject(i)))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing logs", e)
        }
        return list
    }

    fun clearLogs(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().remove(KEY_LOGS).apply()
        context.sendBroadcast(Intent(ACTION_LOGS_UPDATED))
    }

    private fun saveLog(context: Context, log: ForwardLog) {
        val currentLogs = getLogs(context).toMutableList()
        currentLogs.add(0, log)
        if (currentLogs.size > 30) {
            currentLogs.removeAt(currentLogs.size - 1)
        }

        val arr = JSONArray()
        for (item in currentLogs) {
            arr.put(item.toJson())
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_LOGS, arr.toString()).apply()

        // Notify UI to refresh
        context.sendBroadcast(Intent(ACTION_LOGS_UPDATED))
    }

    /**
     * Forwards an SMS asynchronously to the webhook endpoint
     */
    fun forwardSms(
        context: Context,
        sender: String,
        body: String,
        timestamp: Long = System.currentTimeMillis(),
        onComplete: ((Boolean, String) -> Unit)? = null
    ) {
        val webhookUrl = getWebhookUrl(context)
        Log.i(TAG, "Forwarding SMS from $sender to $webhookUrl...")

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val jsonPayload = JSONObject().apply {
                    put("raw_sms", body)
                    put("sender", sender)
                    put("timestamp", timestamp)
                    put("source", "android-companion")
                }

                val mediaType = "application/json; charset=utf-8".toMediaType()
                val requestBody = jsonPayload.toString().toRequestBody(mediaType)

                val request = Request.Builder()
                    .url(webhookUrl)
                    .post(requestBody)
                    .header("User-Agent", "SmartSpend-Android-Sync/1.0")
                    .build()

                val response = httpClient.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                val statusCode = response.code

                val isSuccess = response.isSuccessful
                val statusText = if (isSuccess) "$statusCode OK" else "HTTP $statusCode: $responseBody"

                Log.i(TAG, "Forward response: $statusText")

                val logEntry = ForwardLog(
                    sender = sender,
                    body = body,
                    timestamp = timestamp,
                    status = statusText,
                    isSuccess = isSuccess
                )
                saveLog(context, logEntry)

                CoroutineScope(Dispatchers.Main).launch {
                    onComplete?.invoke(isSuccess, statusText)
                }

            } catch (e: Exception) {
                Log.e(TAG, "Failed to forward SMS", e)
                val statusText = "Failed: ${e.message ?: "Network Error"}"

                val logEntry = ForwardLog(
                    sender = sender,
                    body = body,
                    timestamp = timestamp,
                    status = statusText,
                    isSuccess = false
                )
                saveLog(context, logEntry)

                CoroutineScope(Dispatchers.Main).launch {
                    onComplete?.invoke(false, statusText)
                }
            }
        }
    }
}
