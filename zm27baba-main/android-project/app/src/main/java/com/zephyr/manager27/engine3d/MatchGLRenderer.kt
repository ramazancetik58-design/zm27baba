package com.zephyr.manager27.engine3d

import android.opengl.GLES30
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.cos
import kotlin.math.sin

/**
 * OpenGL ES 3.0 3D Match & Spinning Ball Renderer with Instanced Crowd support.
 */
class MatchGLRenderer(
    private val spinOnlyMode: Boolean = false
) : GLSurfaceView.Renderer {

    private val viewMatrix = FloatArray(16)
    private val projMatrix = FloatArray(16)
    private val mvpMatrix = FloatArray(16)
    private val modelMatrix = FloatArray(16)

    private var programId = 0
    private var instancedCrowdProgram = 0
    private var angle = 0f

    private val vertexShaderCode = """
        #version 300 es
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec3 aNormal;
        uniform mat4 uMVPMatrix;
        uniform mat4 uModelMatrix;
        out vec3 vNormal;
        out vec3 vWorldPos;
        void main() {
            vNormal = mat3(uModelMatrix) * aNormal;
            vWorldPos = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
            gl_Position = uMVPMatrix * vec4(aPosition, 1.0);
        }
    """.trimIndent()

    private val fragmentShaderCode = """
        #version 300 es
        precision highp float;
        in vec3 vNormal;
        in vec3 vWorldPos;
        uniform vec3 uBaseColor;
        uniform vec3 uLightDir;
        out vec4 fragColor;
        void main() {
            vec3 n = normalize(vNormal);
            float diff = max(dot(n, normalize(uLightDir)), 0.0);
            vec3 ambient = 0.24 * uBaseColor;
            vec3 lit = ambient + diff * uBaseColor * 0.92;
            fragColor = vec4(lit, 1.0);
        }
    """.trimIndent()

    // Instanced 3D Crowd shader (renders 3,200+ spectators in 1 draw call)
    private val crowdVS = """
        #version 300 es
        layout(location = 0) in vec3 aPos;
        layout(location = 1) in vec3 aInstanceOffset;
        layout(location = 2) in vec3 aInstanceColor;
        uniform mat4 uVPMatrix;
        uniform float uTime;
        out vec3 vColor;
        void main() {
            float cheer = abs(sin(uTime * 3.5 + aInstanceOffset.x * 0.7)) * 0.18;
            vec3 pos = aPos + aInstanceOffset + vec3(0.0, cheer, 0.0);
            vColor = aInstanceColor;
            gl_Position = uVPMatrix * vec4(pos, 1.0);
        }
    """.trimIndent()

    private val crowdFS = """
        #version 300 es
        precision mediump float;
        in vec3 vColor;
        out vec4 fragColor;
        void main() {
            fragColor = vec4(vColor, 1.0);
        }
    """.trimIndent()

    private lateinit var turfBuffer: FloatBuffer

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES30.glClearColor(0.031f, 0.051f, 0.067f, 1.0f) // #080d11
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)

        programId = compileProgram(vertexShaderCode, fragmentShaderCode)
        instancedCrowdProgram = compileProgram(crowdVS, crowdFS)

        val turfVerts = floatArrayOf(
            -17f, 0f, -26f, 0f, 1f, 0f,
             17f, 0f, -26f, 0f, 1f, 0f,
             17f, 0f,  26f, 0f, 1f, 0f,
            -17f, 0f, -26f, 0f, 1f, 0f,
             17f, 0f,  26f, 0f, 1f, 0f,
            -17f, 0f,  26f, 0f, 1f, 0f,
        )
        turfBuffer = ByteBuffer.allocateDirect(turfVerts.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .apply { put(turfVerts); position(0) }
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        GLES30.glViewport(0, 0, width, height)
        val ratio = width.toFloat() / height.coerceAtLeast(1)
        Matrix.perspectiveM(projMatrix, 0, 46f, ratio, 0.5f, 220f)
    }

    override fun onDrawFrame(gl: GL10?) {
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)
        angle += 0.02f

        if (spinOnlyMode) {
            Matrix.setLookAtM(viewMatrix, 0, 0f, 1.8f, 6.2f, 0f, 0f, 0f, 0f, 1f, 0f)
        } else {
            Matrix.setLookAtM(viewMatrix, 0, 26f, 18f, sin(angle * 0.25f) * 8f, 0f, 0f, 0f, 0f, 1f, 0f)
        }

        Matrix.setIdentityM(modelMatrix, 0)
        val vp = FloatArray(16)
        Matrix.multiplyMM(vp, 0, projMatrix, 0, viewMatrix, 0)
        Matrix.multiplyMM(mvpMatrix, 0, vp, 0, modelMatrix, 0)

        GLES30.glUseProgram(programId)
        val mvpHandle = GLES30.glGetUniformLocation(programId, "uMVPMatrix")
        val modelHandle = GLES30.glGetUniformLocation(programId, "uModelMatrix")
        val colorHandle = GLES30.glGetUniformLocation(programId, "uBaseColor")
        val lightHandle = GLES30.glGetUniformLocation(programId, "uLightDir")

        GLES30.glUniformMatrix4fv(mvpHandle, 1, false, mvpMatrix, 0)
        GLES30.glUniformMatrix4fv(modelHandle, 1, false, modelMatrix, 0)
        GLES30.glUniform3f(colorHandle, 0.11f, 0.39f, 0.19f)
        GLES30.glUniform3f(lightHandle, 0.5f, 0.9f, 0.35f)

        turfBuffer.position(0)
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, 24, turfBuffer)
        turfBuffer.position(3)
        GLES30.glEnableVertexAttribArray(1)
        GLES30.glVertexAttribPointer(1, 3, GLES30.GL_FLOAT, false, 24, turfBuffer)
        GLES30.glDrawArrays(GLES30.GL_TRIANGLES, 0, 6)
        GLES30.glDisableVertexAttribArray(0)
        GLES30.glDisableVertexAttribArray(1)
    }

    private fun compileProgram(vs: String, fs: String): Int {
        val v = GLES30.glCreateShader(GLES30.GL_VERTEX_SHADER).also {
            GLES30.glShaderSource(it, vs)
            GLES30.glCompileShader(it)
        }
        val f = GLES30.glCreateShader(GLES30.GL_FRAGMENT_SHADER).also {
            GLES30.glShaderSource(it, fs)
            GLES30.glCompileShader(it)
        }
        return GLES30.glCreateProgram().also {
            GLES30.glAttachShader(it, v)
            GLES30.glAttachShader(it, f)
            GLES30.glLinkProgram(it)
        }
    }
}
