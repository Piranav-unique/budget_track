package com.aurumgold.smartspend.sync

import org.json.JSONObject

data class ForwardLog(
    val id: String = System.currentTimeMillis().toString(),
    val sender: String,
    val body: String,
    val timestamp: Long,
    val status: String,
    val isSuccess: Boolean
) {
    fun toJson(): JSONObject {
        return JSONObject().apply {
            put("id", id)
            put("sender", sender)
            put("body", body)
            put("timestamp", timestamp)
            put("status", status)
            put("isSuccess", isSuccess)
        }
    }

    companion object {
        fun fromJson(json: JSONObject): ForwardLog {
            return ForwardLog(
                id = json.optString("id", System.currentTimeMillis().toString()),
                sender = json.optString("sender", "Unknown"),
                body = json.optString("body", ""),
                timestamp = json.optLong("timestamp", System.currentTimeMillis()),
                status = json.optString("status", "Unknown"),
                isSuccess = json.optBoolean("isSuccess", false)
            )
        }
    }
}
