package com.zephyr.manager27.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val ZephyrBg = Color(0xFF080D11)
val ZephyrPanel = Color(0xFF111B21)
val ZephyrAccent = Color(0xFFB7FF4A)
val ZephyrNavy = Color(0xFF0A1128)
val ZephyrCyan = Color(0xFF00E5FF)
val ZephyrGold = Color(0xFFF5B82E)
val ZephyrDanger = Color(0xFFEF4444)

private val DarkScheme = darkColorScheme(
    primary = ZephyrAccent,
    secondary = ZephyrCyan,
    background = ZephyrBg,
    surface = ZephyrPanel,
    onPrimary = ZephyrBg,
    onBackground = Color(0xFFF1F5F9),
    onSurface = Color(0xFFF1F5F9),
)

@Composable
fun ZephyrTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkScheme,
        content = content
    )
}
