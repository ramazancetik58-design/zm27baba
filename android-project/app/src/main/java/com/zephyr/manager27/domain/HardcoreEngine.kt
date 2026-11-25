package com.zephyr.manager27.domain

enum class LicenseStatus { NO_DATA, FULL_LICENSE }

data class NegotiationResult(
    val accepted: Boolean,
    val walkedAway: Boolean,
    val counterFeeEur: Long,
    val message: String
)

object HardcoreEngine {
    fun activateLicense(code: String): LicenseStatus {
        return if (code.trim().equals("ZEPHYR-FULL", ignoreCase = true)) {
            LicenseStatus.FULL_LICENSE
        } else {
            LicenseStatus.NO_DATA
        }
    }

    /**
     * Stubborn AI Transfer Negotiation:
     * - Never accepts on Round 1.
     * - Demands 125% - 150% of market valuation.
     * - Walks away on lowball bids (< 85% market value).
     */
    fun evaluateOffer(
        round: Int,
        marketValueEur: Long,
        askingPriceEur: Long,
        offerEur: Long,
        buyerBudgetEur: Long
    ): NegotiationResult {
        if (offerEur > buyerBudgetEur) {
            return NegotiationResult(false, false, askingPriceEur, "Bütçe yetersiz!")
        }
        if (offerEur < (marketValueEur * 0.85).toLong()) {
            return NegotiationResult(false, true, askingPriceEur, "Hakaret teklifi: Kulüp masadan kalktı.")
        }
        if (round == 1) {
            val stubbornAsk = maxOf(askingPriceEur, (offerEur * 1.24).toLong(), (marketValueEur * 1.35).toLong())
            return NegotiationResult(false, false, stubbornAsk, "İlk teklif reddedildi. Talep: €${stubbornAsk / 1_000_000}M")
        }
        if (offerEur >= (askingPriceEur * 0.95).toLong()) {
            return NegotiationResult(true, false, offerEur, "Transfer kabul edildi!")
        }
        return NegotiationResult(false, false, (askingPriceEur * 0.98).toLong(), "Kulüp direnmeye devam ediyor.")
    }
}
