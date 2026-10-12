// Genera una contraseña fácil de dictar o copiar: "kd7m-p3wx-h9tn" (12 caracteres + guiones).
// Sin letras que se confunden (l/1, o/0). crypto.getRandomValues SÍ funciona sin HTTPS
// (a diferencia de crypto.randomUUID), y es aleatoriedad de verdad, no Math.random().
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length])
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8)].map((g) => g.join('')).join('-')
}

export const MIN_PASSWORD = 10 // el mismo mínimo que el backend
