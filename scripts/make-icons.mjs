// Generates simple PNG app icons (kettlebell glyph) without image libraries.
import fs from 'node:fs'
import zlib from 'node:zlib'

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size) {
  const px = Buffer.alloc(size * size * 3)
  const bg = [15, 118, 110]
  const s = size / 64
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const X = x / s, Y = y / s
      let col = bg
      const dBody = Math.hypot(X - 32, Y - 40)
      const dHandle = Math.hypot(X - 32, Y - 24)
      const onHandle = Y <= 28 && dHandle >= 7.5 && dHandle <= 12.5 && Y < 28
      if (dBody <= 14 || onHandle) col = [255, 255, 255]
      const i = (y * size + x) * 3
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]
    }
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
fs.mkdirSync('public', { recursive: true })
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]])
  fs.writeFileSync(`public/${name}`, png(size))
console.log('icons written')
