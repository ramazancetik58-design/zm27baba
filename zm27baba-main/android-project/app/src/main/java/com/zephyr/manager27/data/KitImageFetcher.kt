package com.zephyr.manager27.data

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import coil.request.ImageRequest

/**
 * Dual-mode visual loader:
 * - Full License (ZEPHYR-FULL): Downloads real club crests/kits via Coil from open sports APIs.
 * - No Data Mode: Draws clean generic vector shield crests in pure Compose Canvas.
 */
@Composable
fun ClubBadgeView(
    isLicensed: Boolean,
    realBadgeUrl: String,
    primaryColor: Color,
    secondaryColor: Color,
    size: Dp = 44.dp
) {
    if (isLicensed && realBadgeUrl.isNotBlank()) {
        SubcomposeAsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(realBadgeUrl)
                .crossfade(true)
                .build(),
            contentDescription = "Club Crest",
            contentScale = ContentScale.Fit,
            modifier = Modifier.size(size),
            error = { GenericVectorShield(primaryColor, secondaryColor, size) }
        )
    } else {
        GenericVectorShield(primaryColor, secondaryColor, size)
    }
}

@Composable
fun GenericVectorShield(primaryColor: Color, secondaryColor: Color, size: Dp) {
    Box(modifier = Modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(size)) {
            val w = this.size.width
            val h = this.size.height
            val shield = Path().apply {
                moveTo(w * 0.5f, h * 0.06f)
                lineTo(w * 0.88f, h * 0.2f)
                lineTo(w * 0.88f, h * 0.52f)
                cubicTo(w * 0.88f, h * 0.74f, w * 0.7f, h * 0.88f, w * 0.5f, h * 0.95f)
                cubicTo(w * 0.3f, h * 0.88f, w * 0.12f, h * 0.74f, w * 0.12f, h * 0.52f)
                lineTo(w * 0.12f, h * 0.2f)
                close()
            }
            drawPath(shield, color = primaryColor)
            drawPath(shield, color = secondaryColor, style = Stroke(width = w * 0.08f))
        }
    }
}
