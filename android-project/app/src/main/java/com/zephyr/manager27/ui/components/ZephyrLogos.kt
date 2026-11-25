package com.zephyr.manager27.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zephyr.manager27.ui.theme.ZephyrCyan
import com.zephyr.manager27.ui.theme.ZephyrGold
import com.zephyr.manager27.ui.theme.ZephyrNavy

@Composable
fun ZephyrManagerMainLogo(modifier: Modifier = Modifier, size: Dp = 110.dp) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(modifier = Modifier.size(size)) {
            val w = this.size.width
            val h = this.size.height
            val shield = Path().apply {
                moveTo(w * 0.50f, h * 0.06f)
                lineTo(w * 0.88f, h * 0.18f)
                lineTo(w * 0.88f, h * 0.50f)
                cubicTo(w * 0.88f, h * 0.72f, w * 0.72f, h * 0.88f, w * 0.50f, h * 0.96f)
                cubicTo(w * 0.28f, h * 0.88f, w * 0.12f, h * 0.72f, w * 0.12f, h * 0.50f)
                lineTo(w * 0.12f, h * 0.18f)
                close()
            }
            drawPath(shield, color = ZephyrNavy)
            drawPath(
                shield,
                color = ZephyrCyan,
                style = Stroke(width = w * 0.045f, join = StrokeJoin.Round)
            )

            val zWind = Path().apply {
                moveTo(w * 0.27f, h * 0.32f)
                lineTo(w * 0.72f, h * 0.32f)
                lineTo(w * 0.36f, h * 0.62f)
                lineTo(w * 0.66f, h * 0.62f)
                cubicTo(w * 0.74f, h * 0.62f, w * 0.77f, h * 0.52f, w * 0.69f, h * 0.49f)
            }
            drawPath(
                zWind,
                color = ZephyrCyan,
                style = Stroke(width = w * 0.055f, cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
            drawLine(
                color = ZephyrCyan,
                start = Offset(w * 0.22f, h * 0.42f),
                end = Offset(w * 0.48f, h * 0.42f),
                strokeWidth = w * 0.04f,
                cap = StrokeCap.Round
            )
            drawLine(
                color = ZephyrCyan.copy(alpha = 0.8f),
                start = Offset(w * 0.24f, h * 0.51f),
                end = Offset(w * 0.40f, h * 0.51f),
                strokeWidth = w * 0.035f,
                cap = StrokeCap.Round
            )
        }
        Spacer(Modifier.height(10.dp))
        Text(
            text = "ZEPHYR MANAGER",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 3.sp
        )
    }
}

@Composable
fun ZephyrStudioSplashLogo(modifier: Modifier = Modifier, size: Dp = 128.dp) {
    val goldBrush = Brush.linearGradient(
        colors = listOf(Color(0xFFFEF08A), ZephyrGold, Color(0xFFB45309))
    )
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(modifier = Modifier.size(size)) {
            val w = this.size.width
            val h = this.size.height
            drawCircle(
                brush = goldBrush,
                radius = w * 0.44f,
                style = Stroke(width = w * 0.02f)
            )
            val zWind = Path().apply {
                moveTo(w * 0.26f, h * 0.31f)
                lineTo(w * 0.74f, h * 0.31f)
                lineTo(w * 0.35f, h * 0.68f)
                lineTo(w * 0.68f, h * 0.68f)
                cubicTo(w * 0.78f, h * 0.68f, w * 0.80f, h * 0.55f, w * 0.70f, h * 0.53f)
            }
            drawPath(
                zWind,
                brush = goldBrush,
                style = Stroke(width = w * 0.065f, cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
            drawLine(
                brush = goldBrush,
                start = Offset(w * 0.20f, h * 0.43f),
                end = Offset(w * 0.48f, h * 0.43f),
                strokeWidth = w * 0.045f,
                cap = StrokeCap.Round
            )
        }
        Spacer(Modifier.height(14.dp))
        Text(
            text = "ZEPHYR STUDIO",
            color = ZephyrGold,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 6.sp
        )
    }
}
