// Compact, zero-dependency QR Code Generator in pure TypeScript
// Produces a 2D boolean matrix for QR Version 1 to 10 with Byte encoding & Error Correction.

type ECCLevel = 'L' | 'M' | 'Q' | 'H';

// QR Code generation helper functions
class QRPolynomial {
  num: number[];
  constructor(num: number[], shift: number = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
    for (let i = 0; i < shift; i++) {
      this.num[num.length - offset + i] = 0;
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gmult(this.get(i), e.get(j));
      }
    }
    return new QRPolynomial(num, 0);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) {
      return this;
    }
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}

class QRMath {
  private static EXP_TABLE: number[] = new Array(256);
  private static LOG_TABLE: number[] = new Array(256);

  static init() {
    for (let i = 0; i < 8; i++) {
      QRMath.EXP_TABLE[i] = 1 << i;
    }
    for (let i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] =
        QRMath.EXP_TABLE[i - 4] ^
        QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^
        QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) {
      QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
    }
  }

  static gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 255) n -= 255;
    return QRMath.EXP_TABLE[n];
  }

  static glog(n: number): number {
    if (n < 1) throw new Error('glog(' + n + ')');
    return QRMath.LOG_TABLE[n];
  }

  static gmult(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return QRMath.gexp(QRMath.glog(a) + QRMath.glog(b));
  }
}
QRMath.init();

class QRBitBuffer {
  buffer: number[] = [];
  length: number = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

// RS Error correction block counts per version for Byte Mode
const RS_BLOCK_TABLE: { [key: number]: number[][] } = {
  1: [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9]],
  2: [[1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16]],
  3: [[1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13]],
  4: [[1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9]],
  5: [[1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12]],
  6: [[2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15]],
  7: [[2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14]],
  8: [[2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15]],
  9: [[2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13]],
  10: [[2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]]
};

const PATTERN_POS_TABLE = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54]
];

export class QRCodeModel {
  typeNumber: number;
  errorCorrectLevel: number;
  modules: (boolean | null)[][] = [];
  moduleCount: number = 0;
  dataList: string[] = [];

  constructor(typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  addData(data: string) {
    this.dataList.push(data);
  }

  isDark(row: number, col: number): boolean {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      return false;
    }
    return !!this.modules[row][col];
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  make() {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount).fill(null);
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    const data = this.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    this.mapData(data, maskPattern);
  }

  private setupPositionProbePattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = c % 2 === 0;
    }
  }

  private setupPositionAdjustPattern() {
    const pos = PATTERN_POS_TABLE[this.typeNumber] || [];
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) continue;

        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean) {
    const bits = this.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number) {
    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = this.getBCHTypeInfo(data);

    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }

      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }
    this.modules[this.moduleCount - 8][8] = !test;
  }

  private mapData(data: number[], maskPattern: number) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;

      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = this.getMask(maskPattern, row, col - c);
            if (mask) {
              dark = !dark;
            }
            this.modules[row][col - c] = dark;
            bitIndex--;

            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }

        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return ((i * j) % 2) + ((i * j) % 3) === 0;
      case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case 7: return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default: return false;
    }
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = this.getLostPoint();
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }

  private getLostPoint(): number {
    const moduleCount = this.moduleCount;
    let lostPoint = 0;

    // LEVEL1
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = this.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === this.isDark(row + r, col + c)) {
              sameCount++;
            }
          }
        }
        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }

    // LEVEL2
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (this.isDark(row, col)) count++;
        if (this.isDark(row + 1, col)) count++;
        if (this.isDark(row, col + 1)) count++;
        if (this.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) {
          lostPoint += 3;
        }
      }
    }

    return lostPoint;
  }

  private createData(typeNumber: number, errorCorrectLevel: number, dataList: string[]): number[] {
    const rsBlocks = RS_BLOCK_TABLE[typeNumber] ? RS_BLOCK_TABLE[typeNumber][errorCorrectLevel] : RS_BLOCK_TABLE[4][0];
    const buffer = new QRBitBuffer();

    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(4, 4); // Byte mode indicator (0100)
      const utf8Bytes = this.toUtf8ByteArray(data);
      buffer.put(utf8Bytes.length, typeNumber < 10 ? 8 : 16);
      for (let j = 0; j < utf8Bytes.length; j++) {
        buffer.put(utf8Bytes[j], 8);
      }
    }

    // Calculate total data count
    let totalDataCount = 0;
    if (rsBlocks.length === 3) {
      totalDataCount = rsBlocks[0] * rsBlocks[2];
    } else if (rsBlocks.length === 6) {
      totalDataCount = rsBlocks[0] * rsBlocks[2] + rsBlocks[3] * rsBlocks[5];
    }

    if (buffer.length + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    while (buffer.length % 8 !== 0) {
      buffer.putBit(false);
    }

    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    return this.createBytes(buffer, rsBlocks);
  }

  private createBytes(buffer: QRBitBuffer, rsBlocks: number[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;

    const dcdata: number[][] = [];
    const ecdata: number[][] = [];

    const blockCount1 = rsBlocks[0];
    const totalCount1 = rsBlocks[1];
    const dataCount1 = rsBlocks[2];

    for (let r = 0; r < blockCount1; r++) {
      const dcCount = dataCount1;
      const ecCount = totalCount1 - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;

      const rsPoly = this.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);

      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    if (rsBlocks.length === 6) {
      const blockCount2 = rsBlocks[3];
      const totalCount2 = rsBlocks[4];
      const dataCount2 = rsBlocks[5];

      for (let r = 0; r < blockCount2; r++) {
        const idx = blockCount1 + r;
        const dcCount = dataCount2;
        const ecCount = totalCount2 - dcCount;
        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[idx] = new Array(dcCount);
        for (let i = 0; i < dcdata[idx].length; i++) {
          dcdata[idx][i] = 0xff & buffer.buffer[i + offset];
        }
        offset += dcCount;

        const rsPoly = this.getErrorCorrectPolynomial(ecCount);
        const rawPoly = new QRPolynomial(dcdata[idx], rsPoly.getLength() - 1);
        const modPoly = rawPoly.mod(rsPoly);

        ecdata[idx] = new Array(rsPoly.getLength() - 1);
        for (let i = 0; i < ecdata[idx].length; i++) {
          const modIndex = i + modPoly.getLength() - ecdata[idx].length;
          ecdata[idx][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
        }
      }
    }

    const data: number[] = [];
    const totalBlocks = dcdata.length;

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < totalBlocks; r++) {
        if (i < dcdata[r].length) {
          data.push(dcdata[r][i]);
        }
      }
    }

    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < totalBlocks; r++) {
        if (i < ecdata[r].length) {
          data.push(ecdata[r][i]);
        }
      }
    }

    return data;
  }

  private getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  }

  private toUtf8ByteArray(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
      }
    }
    return bytes;
  }

  private getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (this.getBCHDigit(d) - this.getBCHDigit(1335) >= 0) {
      d ^= 1335 << (this.getBCHDigit(d) - this.getBCHDigit(1335));
    }
    return ((data << 10) | d) ^ 21522;
  }

  private getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (this.getBCHDigit(d) - this.getBCHDigit(7973) >= 0) {
      d ^= 7973 << (this.getBCHDigit(d) - this.getBCHDigit(7973));
    }
    return (data << 12) | d;
  }

  private getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }
}

/**
 * Creates a boolean 2D matrix for the given text.
 */
export function generateQRMatrix(text: string): boolean[][] {
  const cleanText = text || 'UPMIZIK';
  const len = cleanText.length;
  
  // Pick optimal version based on string length
  let version = 2;
  if (len > 120) version = 8;
  else if (len > 80) version = 6;
  else if (len > 50) version = 5;
  else if (len > 32) version = 4;
  else if (len > 18) version = 3;

  for (let v = version; v <= 10; v++) {
    try {
      const qr = new QRCodeModel(v, 1); // Level M
      qr.addData(cleanText);
      qr.make();
      const count = qr.getModuleCount();
      const matrix: boolean[][] = [];
      for (let r = 0; r < count; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < count; c++) {
          row.push(qr.isDark(r, c));
        }
        matrix.push(row);
      }
      return matrix;
    } catch {
      // If version too small, try next version
    }
  }

  // Fallback version 4
  const qr = new QRCodeModel(4, 0); // Level L
  qr.addData(cleanText.substring(0, 40));
  qr.make();
  const count = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let r = 0; r < count; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < count; c++) {
      row.push(qr.isDark(r, c));
    }
    matrix.push(row);
  }
  return matrix;
}
