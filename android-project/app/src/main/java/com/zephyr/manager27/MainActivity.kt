package com.zephyr.manager27

import android.opengl.GLSurfaceView
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.zephyr.manager27.domain.HardcoreEngine
import com.zephyr.manager27.domain.LicenseStatus
import com.zephyr.manager27.engine3d.MatchGLRenderer
import com.zephyr.manager27.ui.components.ZephyrManagerMainLogo
import com.zephyr.manager27.ui.components.ZephyrStudioSplashLogo
import com.zephyr.manager27.ui.theme.ZephyrAccent
import com.zephyr.manager27.ui.theme.ZephyrBg
import com.zephyr.manager27.ui.theme.ZephyrPanel
import com.zephyr.manager27.ui.theme.ZephyrTheme
import kotlinx.coroutines.delay

enum class Screen {
    SPLASH, MAIN_MENU, CLUB_SELECT, DASHBOARD, SQUAD, TACTICS,
    MATCHDAY, MATCH_RESULT, STANDINGS, TRANSFERS, FINANCE, LICENSE, SETTINGS
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ZephyrTheme {
                var screen by remember { mutableStateOf(Screen.SPLASH) }
                var licenseStatus by remember { mutableStateOf(LicenseStatus.NO_DATA) }
                var licenseInput by remember { mutableStateOf("") }

                LaunchedEffect(Unit) {
                    delay(2000L)
                    screen = Screen.MAIN_MENU
                }

                Box(modifier = Modifier.fillMaxSize().background(ZephyrBg)) {
                    when (screen) {
                        Screen.SPLASH -> {
                            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                ZephyrStudioSplashLogo()
                            }
                        }
                        Screen.MAIN_MENU -> {
                            AndroidView(
                                factory = { ctx ->
                                    GLSurfaceView(ctx).apply {
                                        setEGLContextClientVersion(3)
                                        setRenderer(MatchGLRenderer(spinOnlyMode = true))
                                    }
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                            Column(
                                modifier = Modifier.fillMaxSize().padding(32.dp),
                                verticalArrangement = Arrangement.Center
                            ) {
                                ZephyrManagerMainLogo()
                                Spacer(Modifier.height(24.dp))
                                Button(
                                    onClick = { screen = Screen.DASHBOARD },
                                    colors = ButtonDefaults.buttonColors(containerColor = ZephyrAccent)
                                ) {
                                    Text("KARİYERE BAŞLA", color = ZephyrBg)
                                }
                                Spacer(Modifier.height(8.dp))
                                OutlinedButton(onClick = { screen = Screen.LICENSE }) {
                                    Text("LİSANS YÖNETİMİ (${licenseStatus.name})")
                                }
                            }
                        }
                        Screen.MATCHDAY -> {
                            AndroidView(
                                factory = { ctx ->
                                    GLSurfaceView(ctx).apply {
                                        setEGLContextClientVersion(3)
                                        setRenderer(MatchGLRenderer(spinOnlyMode = false))
                                    }
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                        Screen.LICENSE -> {
                            Column(
                                modifier = Modifier.fillMaxSize().padding(32.dp),
                                verticalArrangement = Arrangement.Center
                            ) {
                                Text("Lisans Kodu (ZEPHYR-FULL)", style = MaterialTheme.typography.titleLarge)
                                Spacer(Modifier.height(12.dp))
                                OutlinedTextField(
                                    value = licenseInput,
                                    onValueChange = { licenseInput = it },
                                    label = { Text("Lisans Kodu") }
                                )
                                Spacer(Modifier.height(12.dp))
                                Button(onClick = {
                                    licenseStatus = HardcoreEngine.activateLicense(licenseInput)
                                    screen = Screen.MAIN_MENU
                                }) {
                                    Text("Lisansı Etkinleştir")
                                }
                            }
                        }
                        else -> {
                            Surface(color = ZephyrPanel, modifier = Modifier.fillMaxSize().padding(24.dp)) {
                                Column(Modifier.padding(24.dp)) {
                                    Text("ZEPHYR MANAGER 27 — ${screen.name}")
                                    Spacer(Modifier.height(16.dp))
                                    Button(onClick = { screen = Screen.MATCHDAY }) {
                                        Text("3D Maç Gününe Geç")
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    Button(onClick = { screen = Screen.MAIN_MENU }) {
                                        Text("Ana Menü")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
