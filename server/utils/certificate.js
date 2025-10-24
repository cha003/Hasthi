// server/utils/certificate.js
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/**
 * Tiny PNG size reader (no extra deps).
 * Returns {width, height} for a PNG file.
 */
function readPngSize(pngPath) {
  const fd = fs.openSync(pngPath, "r");
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  // PNG signature then IHDR width/height at bytes 16..23 (big-endian)
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
  if (!isPng) throw new Error("Template is not a PNG");
  const width  = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

/**
 * Generates an Adoption Certificate PDF (LANDSCAPE) using a PNG template.
 * Template is drawn aspect-fit (no stretching). Text is positioned by
 * percentages relative to the drawn image area.
 *
 * Optional ENV:
 *  - CERTIFICATE_TEMPLATE_PATH: PNG path
 *  - CERTIFICATE_FONT_PATH: TTF/OTF path (Unicode)
 *  - CERT_NAME_Y, CERT_NAME_W
 *  - CERT_ELE_Y,  CERT_ELE_W
 *  - CERT_ID_X,   CERT_ID_Y, CERT_ID_W
 *  - CERT_ISS_X,  CERT_ISS_Y, CERT_ISS_W
 */
async function generateAdoptionCertificate({ user, elephant, requestId, issuedAt = new Date() }) {
  const uploadsDir = path.join(__dirname, "..", "uploads");
  const certDir = path.join(uploadsDir, "certificates");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

  const filename = `adoption-certificate-${requestId}.pdf`;
  const absoluteFsPath = path.join(certDir, filename);
  const relativeUrl = `/uploads/certificates/${filename}`;

  const templatePath =
    process.env.CERTIFICATE_TEMPLATE_PATH
      ? path.resolve(process.env.CERTIFICATE_TEMPLATE_PATH)
      : path.join(__dirname, "..", "assets", "certificates", "hasthi-adoption-template.png");

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Certificate template not found at: ${templatePath}\n` +
      `Place PNG at server/assets/certificates/hasthi-adoption-template.png or set CERTIFICATE_TEMPLATE_PATH`
    );
  }

  // A4 LANDSCAPE
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const stream = fs.createWriteStream(absoluteFsPath);
  doc.pipe(stream);

  // Fonts (optional Unicode)
  let bodyFont = "Helvetica";
  let boldFont = "Helvetica-Bold";
  const unicodeFontPath =
    process.env.CERTIFICATE_FONT_PATH
      ? path.resolve(process.env.CERTIFICATE_FONT_PATH)
      : path.join(__dirname, "..", "assets", "certificates", "unicode.ttf"); // optional
  try {
    if (fs.existsSync(unicodeFontPath)) {
      doc.registerFont("AppUnicode", unicodeFontPath);
      bodyFont = "AppUnicode";
      boldFont = "AppUnicode";
    }
  } catch (_) {}

  const pageW = doc.page.width;   // ~842
  const pageH = doc.page.height;  // ~595

  // Draw PNG aspect-fit, centered (no stretch)
  const { width: imgW, height: imgH } = readPngSize(templatePath);
  const scale = Math.min(pageW / imgW, pageH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const imgX = (pageW - drawW) / 2;
  const imgY = (pageH - drawH) / 2;
  doc.image(templatePath, imgX, imgY, { width: drawW, height: drawH });

  // Relative placement helpers (0..1 within drawn image rect)
  const px = (percentX) => imgX + percentX * drawW;
  const py = (percentY) => imgY + percentY * drawH;

  const drawCentered = (text, yPct, wPct, baseSize, color = "#2b2b2b") => {
    const maxW = drawW * wPct;
    let size = baseSize;
    doc.font(bodyFont).fontSize(size);
    while (doc.widthOfString(text) > maxW && size > 8) {
      size -= 1;
      doc.fontSize(size);
    }
    doc.fillColor(color).text(text, px(0.5 - wPct / 2), py(yPct), { width: maxW, align: "center" });
  };

  const drawLeft = (text, xPct, yPct, wPct, size = 12, color = "#2b2b2b") => {
    doc.font(bodyFont).fontSize(size).fillColor(color)
      .text(text, px(xPct), py(yPct), { width: drawW * wPct, align: "left" });
  };

  // Dynamic values
  const presentedToName = user?.name || user?.email || "Adopter";
  const elephantName    = elephant?.name || "—";
  const certificateId   = String(requestId).toUpperCase();
  const issuedDate      = new Date(issuedAt).toLocaleDateString();

  /**
   * ===================  Tuned placements (from your marks)  ===================
   * You can nudge any of these by setting the matching ENV variable.
   */

  // Name — lower to sit ON the long underline (centered)
  const NAME_Y = parseFloat(process.env.CERT_NAME_Y || "0.510"); // was 0.47 -> 0.505 (down)
  const NAME_W = parseFloat(process.env.CERT_NAME_W || "0.58");

  // Adopted Elephant — push further DOWN below its label
  const ELE_Y  = parseFloat(process.env.CERT_ELE_Y  || "0.75");  // was 0.68 -> 0.74 (down)
  const ELE_W  = parseFloat(process.env.CERT_ELE_W  || "0.47");  // methninn dakunata 

  // Certificate ID — shift RIGHT and a touch DOWN to sit on the underline
  const ID_X   = parseFloat(process.env.CERT_ID_X   || "0.350"); // was 0.21 -> 0.285 (right)
  const ID_Y   = parseFloat(process.env.CERT_ID_Y   || "0.905"); // was 0.88 -> 0.905 (down)
  const ID_W   = parseFloat(process.env.CERT_ID_W   || "0.35");  // width across the line

  // Issued on — move RIGHT and DOWN, away from signature; stay above diagonal band
  const ISS_X  = parseFloat(process.env.CERT_ISS_X  || "0.285");  // was 0.72 -> 0.80 (right)
  const ISS_Y  = parseFloat(process.env.CERT_ISS_Y  || "0.935"); // was 0.84 -> 0.875 (down)
  const ISS_W  = parseFloat(process.env.CERT_ISS_W  || "0.35");

  // Render text
  drawCentered(presentedToName, NAME_Y, NAME_W, /*base size*/ 30, "#2b2b2b");
  drawCentered(elephantName,    ELE_Y,  ELE_W,  /*base size*/ 20, "#2b2b2b");
  drawLeft(` ${certificateId}`, ID_X,   ID_Y,   ID_W,          /*size*/ 12, "#2b2b2b");
  drawLeft(`Issued on: ${issuedDate}`, ISS_X, ISS_Y, ISS_W, /*size*/ 10, "#6b6b6b");

  // Finish
  doc.end();
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { relativeUrl, absoluteFsPath, filename };
}

module.exports = { generateAdoptionCertificate };
