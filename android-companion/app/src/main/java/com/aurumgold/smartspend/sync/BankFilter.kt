package com.aurumgold.smartspend.sync

import java.util.Locale

object BankFilter {

    // Indian Bank Sender Header Regex (DLT registered headers)
    private val BANK_HEADER_PATTERN = Regex(
        ".*(SBI|HDFC|ICICI|AXIS|KOTAK|CANBNK|CANARA|PNBSMS|PNB|INDUS|UNIONB|UNION|IDFC|YESBNK|YES|BARODA|BOI|CITI|HSBC|PAYTM|GPAY|AMEX|SCISMS|AUBANK|FEDBNK|BANDHN|RBLBNK).*",
        RegexOption.IGNORE_CASE
    )

    // Financial keywords indicating debit/credit/UPI transaction
    private val TRANSACTION_KEYWORDS = listOf(
        "debited", "credited", "withdrawn", "spent", "transferred",
        "deposited", "received", "sent", "txn", "transaction",
        "upi", "vpa", "neft", "imps", "rtgs", "atm",
        "avl bal", "available bal", "ac bal", "bal inr"
    )

    // Currency indicators (Rs, INR, ₹)
    private val CURRENCY_PATTERN = Regex("(rs\\.?|inr|₹)\\s*\\d+", RegexOption.IGNORE_CASE)

    /**
     * Determines whether an incoming SMS is a relevant banking transaction message
     */
    fun isBankSms(sender: String?, body: String?): Boolean {
        if (body.isNullOrBlank()) return false

        val cleanSender = sender?.uppercase(Locale.ROOT) ?: ""
        val lowerBody = body.lowercase(Locale.ROOT)

        val isKnownBankSender = cleanSender.matches(BANK_HEADER_PATTERN)
        val hasTransactionKeyword = TRANSACTION_KEYWORDS.any { lowerBody.contains(it) }
        val hasCurrencyAmount = CURRENCY_PATTERN.containsMatchIn(body)

        // Accept if it's from a bank sender and has transaction context
        if (isKnownBankSender && (hasTransactionKeyword || hasCurrencyAmount)) {
            return true
        }

        // Or if sender is alphanumeric code and body has strong financial transaction indicators
        if (cleanSender.length in 5..11 && hasTransactionKeyword && hasCurrencyAmount) {
            return true
        }

        return false
    }
}
