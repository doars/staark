export const DIFFIE_HELLMAN_ALGORITHM = 'ECDH'
export const DIFFIE_HELLMAN_CURVE = 'P-256'
export const DIFFIE_HELLMAN_PUBLIC_KEY_EXPORT_FORMAT = 'raw'
export const HASH_ALGORITHM = 'SHA-256'
export const PUBLIC_KEY_EXPORT_FORMAT = 'spki'
export const SHARED_ENCRYPTION_ALGORITHM = 'AES-GCM'
export const SHARED_KEY_LENGTH = 256
export const USER_ENCRYPTION_ALGORITHM = 'RSA-OAEP'
export const USER_SIGNATURE_ALGORITHM = 'RSASSA-PKCS1-v1_5'

export const userKeyGenerator = (
) => {
  self.addEventListener('message', (
  ) => {
    Promise.all([
      crypto.subtle.generateKey({
        name: USER_ENCRYPTION_ALGORITHM,
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: HASH_ALGORITHM, },
      }, true, ['encrypt', 'decrypt',]),
      crypto.subtle.generateKey({
        name: USER_SIGNATURE_ALGORITHM,
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: HASH_ALGORITHM, },
      }, true, ['sign', 'verify',]),
      crypto.subtle.generateKey({
        name: DIFFIE_HELLMAN_ALGORITHM,
        namedCurve: DIFFIE_HELLMAN_CURVE,
      }, true, ['deriveKey',]),
    ])
      .then(([
        myEncryptKeys,
        mySignKeys,
        myExchangeKeys,
      ]) => {
        Promise.all([
          crypto.subtle.exportKey(
            PUBLIC_KEY_EXPORT_FORMAT,
            myEncryptKeys.publicKey,
          ),
          crypto.subtle.exportKey(
            PUBLIC_KEY_EXPORT_FORMAT,
            mySignKeys.publicKey,
          ),
        ])
          .then(([
            myPublicEncryptKey,
            myPublicSignKey,
          ]) => {
            self.postMessage({
              success: true,
              data: {
                myEncryptKeys,
                mySignKeys,
                myExchangeKeys,
                myPublicEncryptKey,
                myPublicSignKey,
              },
            })
          })
          .catch((error) => {
            self.postMessage({
              success: false,
              error: error.message,
            })
          })
      })
      .catch((error) => {
        self.postMessage({
          success: false,
          error: error.message,
        })
      })
  })
}

export const sharedKeyGenerator = (
) => {
  self.addEventListener('message', (
  ) => {
    crypto.subtle.generateKey({
      length: SHARED_KEY_LENGTH,
      name: SHARED_ENCRYPTION_ALGORITHM,
    }, true, ['encrypt', 'decrypt'])
      .then(sharedKey => {
        self.postMessage({
          success: true,
          data: {
            sharedKey,
          },
        })
      })
      .catch(error => {
        self.postMessage({
          success: false,
          error: error.message,
        })
      })
  })
}
