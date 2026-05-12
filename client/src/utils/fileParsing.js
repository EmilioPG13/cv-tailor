function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll("script,style,noscript").forEach(n => n.remove());
  return (div.textContent || "").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripRTF(rtf) {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\{\\\*[^}]*\}/g, "")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readAsArrayBuffer(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsArrayBuffer(file);
  });
}

async function extractPDF(file) {
  if (!window.pdfjsLib) throw new Error("PDF parser not loaded");
  const buf = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    let lastY = null, line = "";
    for (const item of tc.items) {
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) { out += line.trim() + "\n"; line = ""; }
      line += item.str + " ";
      lastY = y;
    }
    out += line.trim() + "\n\n";
  }
  return out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractDOCX(file) {
  if (!window.mammoth) throw new Error("DOCX parser not loaded");
  const buf = await readAsArrayBuffer(file);
  const res = await window.mammoth.extractRawText({ arrayBuffer: buf });
  return (res.value || "").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractText(file) {
  if (!file) throw new Error("No file");
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (name.endsWith(".pdf") || type === "application/pdf") return extractPDF(file);
  if (name.endsWith(".docx") || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return extractDOCX(file);
  if (name.endsWith(".doc")) throw new Error("Legacy .doc not supported — please re-save as .docx or PDF");
  if (name.endsWith(".rtf") || type === "application/rtf" || type === "text/rtf") return stripRTF(await file.text());
  if (name.endsWith(".html") || name.endsWith(".htm") || type === "text/html") return stripHTML(await file.text());
  return (await file.text()).trim();
}
