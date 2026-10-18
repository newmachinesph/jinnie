package app.jinnie.crypto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/*
 * The one piece of crypto the platform already ships that JavaScript cannot
 * do at a useful speed: a password KDF. Hermes runs PBKDF2 at milliseconds per
 * round; the platform's implementation runs hundreds of thousands of rounds
 * in well under a second. AES-GCM stays in JS, where it is fast enough.
 */
class JinnieCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("JinnieCrypto")

    // Runs off the JS thread. Returns the derived key as lowercase hex.
    AsyncFunction("pbkdf2Sha256") { password: String, saltHex: String, iterations: Int, length: Int ->
      require(iterations in 1..10_000_000) { "iterations out of range" }
      require(length in 16..64) { "length out of range" }
      val spec = PBEKeySpec(password.toCharArray(), hexToBytes(saltHex), iterations, length * 8)
      try {
        val key = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        bytesToHex(key)
      } finally {
        spec.clearPassword()
      }
    }
  }

  private fun hexToBytes(hex: String): ByteArray {
    require(hex.length % 2 == 0) { "salt must be hex" }
    return ByteArray(hex.length / 2) { i -> hex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
  }

  private fun bytesToHex(bytes: ByteArray): String =
    bytes.joinToString("") { "%02x".format(it) }
}
