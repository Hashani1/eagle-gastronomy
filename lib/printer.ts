// lib/printer.ts
import { centNëEuro } from './çmimi';

interface ArtikullPrint {
  emri: string;
  sasia: number;
  çmimi: number; // cent
  çmimiNjësi?: number;
  opsionet?: { emri: string; çmimi: number }[];
  shënime?: string;
}

interface KuponData {
  emriBiznesit: string;
  adresa?: string;
  telefoni?: string;
  tavolina: string;
  kamarieri: string;
  data: string;
  ora: string;
  numriPorosisë: string;
  artikujt: ArtikullPrint[];
  totali: number; // cent
  metoda?: string;
  numëruarCash?: number;
  kusur?: number;
  titulli?: string;
  tipi?: 'faturë' | 'kuzhinë' | 'shank';
}

/**
 * Printon një kupon fature në një dritare të re.
 * Përdoret pas pagesës për t'i dhënë klientit faturën.
 */
export function printoKupon(data: KuponData): void {
  const dritare = window.open('', '_blank', 'width=400,height=800');
  if (!dritare) {
    alert('⚠️ Lejo dritaret pop-up për të printuar kuponin!');
    return;
  }

  const html = gjeneroHTMLKuponi(data, 'faturë');
  dritare.document.write(html);
  dritare.document.close();
}

/**
 * Printon porosinë për kuzhinë (pa çmime, me theks te opsionet).
 */
export function printoKuzhinë(data: KuponData): void {
  const dritare = window.open('', '_blank', 'width=400,height=800');
  if (!dritare) {
    alert('⚠️ Lejo dritaret pop-up!');
    return;
  }
  const html = gjeneroHTMLKuponi(data, 'kuzhinë');
  dritare.document.write(html);
  dritare.document.close();
}

/**
 * Printon porosinë për shank (pa çmime, me theks te opsionet).
 */
export function printoShank(data: KuponData): void {
  const dritare = window.open('', '_blank', 'width=400,height=800');
  if (!dritare) {
    alert('⚠️ Lejo dritaret pop-up!');
    return;
  }
  const html = gjeneroHTMLKuponi(data, 'shank');
  dritare.document.write(html);
  dritare.document.close();
}

function gjeneroHTMLKuponi(
  data: KuponData,
  tipi: 'faturë' | 'kuzhinë' | 'shank'
): string {
  const eshteFaturë = tipi === 'faturë';
  const titulli =
    tipi === 'faturë'
      ? data.titulli || 'FATURË'
      : tipi === 'kuzhinë'
      ? '👨‍🍳 POROSI KUZHINË'
      : '🍹 POROSI SHANK';

  const artikujtHTML = data.artikujt
    .map((a) => {
      const opsionet = a.opsionet && a.opsionet.length > 0
        ? `<div class="opsionet">🔧 ${a.opsionet.map((o) => o.emri).join(', ')}</div>`
        : '';
      const shënime = a.shënime
        ? `<div class="shenime">⚠ ${a.shënime}</div>`
        : '';
      const çmimiHTML = eshteFaturë
        ? `<div class="rresht">
            <span>${a.sasia} × ${centNëEuro(a.çmimiNjësi || a.çmimi)} €</span>
            <span>${centNëEuro(a.çmimi * a.sasia)} €</span>
          </div>`
        : `<div class="sasia">Sasia: ${a.sasia}</div>`;

      return `
        <div class="artikull">
          <div class="emri">${a.emri}</div>
          ${opsionet}
          ${shënime}
          ${çmimiHTML}
        </div>
      `;
    })
    .join('');

  const totaliHTML = eshteFaturë
    ? `
      <div class="totali-rresht">
        <span>TOTALI:</span>
        <span class="totali-vlera">${centNëEuro(data.totali)} €</span>
      </div>
      ${data.metoda ? `<div class="metoda">Metoda: ${data.metoda === 'CASH' ? '💵 Cash' : '💳 Kartë'}</div>` : ''}
      ${data.numëruarCash !== undefined ? `<div class="metoda">Dha: ${centNëEuro(data.numëruarCash)} €</div>` : ''}
      ${data.kusur !== undefined && data.kusur > 0 ? `<div class="metoda">Kusuri: ${centNëEuro(data.kusur)} €</div>` : ''}
    `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="sq">
    <head>
      <meta charset="UTF-8" />
      <title>${titulli}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Courier New', 'Consolas', monospace;
        }
        body {
          width: 80mm;
          padding: 4mm;
          font-size: 11px;
          color: #000;
          background: #fff;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .header h1 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .header .sub {
          font-size: 10px;
          color: #555;
        }
        .header .titulli {
          font-size: 14px;
          font-weight: bold;
          margin-top: 6px;
          padding: 4px;
          border: 2px solid #000;
          display: inline-block;
        }
        .info {
          border-bottom: 1px dashed #000;
          padding-bottom: 6px;
          margin-bottom: 8px;
          font-size: 10px;
        }
        .info div {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .artikull {
          padding: 4px 0;
          border-bottom: 1px dotted #ccc;
        }
        .emri {
          font-weight: bold;
          font-size: 12px;
        }
        .opsionet {
          font-size: 10px;
          color: #0369a1;
          margin-top: 2px;
          padding: 2px 4px;
          background: #e0f2fe;
          border-radius: 2px;
        }
        .shenime {
          font-size: 10px;
          color: #dc2626;
          margin-top: 2px;
          padding: 2px 4px;
          background: #fee2e2;
          border-radius: 2px;
        }
        .sasia {
          font-size: 10px;
          color: #555;
          margin-top: 2px;
        }
        .rresht {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #555;
          margin-top: 2px;
        }
        .totali-rresht {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: bold;
          border-top: 2px dashed #000;
          border-bottom: 2px dashed #000;
          padding: 6px 0;
          margin-top: 8px;
        }
        .totali-vlera {
          font-size: 16px;
        }
        .metoda {
          font-size: 10px;
          color: #555;
          margin-top: 4px;
          text-align: right;
        }
        .footer {
          text-align: center;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 2px dashed #000;
          font-size: 10px;
        }
        .footer .faleminderit {
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .footer .info-shtese {
          color: #666;
          font-size: 9px;
        }
        @media print {
          body {
            width: 80mm;
            padding: 3mm;
          }
          .no-print {
            display: none;
          }
        }
        .no-print {
          margin-top: 10px;
          text-align: center;
        }
        .no-print button {
          padding: 8px 16px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          font-size: 12px;
          margin: 0 4px;
        }
        .no-print button.gri {
          background: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🍽️ ${data.emriBiznesit}</h1>
        ${data.adresa ? `<div class="sub">${data.adresa}</div>` : ''}
        ${data.telefoni ? `<div class="sub">Tel: ${data.telefoni}</div>` : ''}
        <div class="titulli">${titulli}</div>
      </div>

      <div class="info">
        <div><span>Tavolina:</span><strong>${data.tavolina}</strong></div>
        <div><span>Kamarieri:</span><span>${data.kamarieri}</span></div>
        <div><span>Data:</span><span>${data.data} · ${data.ora}</span></div>
        <div><span>Nr. Porosisë:</span><span>#${data.numriPorosisë}</span></div>
      </div>

      <div class="artikujt">
        ${artikujtHTML}
      </div>

      ${totaliHTML}

      <div class="footer">
        ${eshteFaturë ? `
          <div class="faleminderit">FALEMINDERIT! 🙏</div>
          <div class="info-shtese">Ju mirëpresim sërish</div>
          <div class="info-shtese" style="margin-top: 4px;">
            Gastronomy SaaS · gastronomy.al
          </div>
        ` : `
          <div class="info-shtese">Përgatit me kujdes!</div>
        `}
      </div>

      <div class="no-print">
        <button onclick="window.print()">🖨️ Printo</button>
        <button class="gri" onclick="window.close()">Mbyll</button>
      </div>

      <script>
        // Printo automatikisht pas 300ms
        setTimeout(function() {
          window.print();
        }, 300);
      </script>
    </body>
    </html>
  `;
}