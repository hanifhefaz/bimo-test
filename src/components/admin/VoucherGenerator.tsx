import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateVouchers } from '@/lib/vouchers';
import { useAuth } from '@/contexts/AuthContext';
import BrandImg from '@/assets/icon.png';

export default function VoucherGenerator() {
  const { userProfile } = useAuth();
  const [amount, setAmount] = useState<number>(1000);
  const [quantity, setQuantity] = useState<number>(10);
  const [price, setPrice] = useState<number>(5.0);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [includeAmount, setIncludeAmount] = useState<boolean>(true);

  if (!userProfile || !userProfile.isAdmin) return null;

  const handleGenerate = async () => {
    if (!amount || amount < 1) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!quantity || quantity < 1 || quantity > 1000) {
      toast.error('Quantity must be 1 - 1000');
      return;
    }
    if (price == null || price < 0) {
      toast.error('Enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const res = await generateVouchers(userProfile.uid, amount, quantity, price);
      setCodes(res.codes);
      toast.success(`Generated ${res.codes.length} vouchers (batch ${res.batchId})`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to generate vouchers');
    } finally {
      setLoading(false);
    }
  };

  const printCards = (
    codes: string[],
    amount: number,
    price: number,
    rows: number,
    includeAmount: boolean
  ) => {
    try {
      const now = new Date().toLocaleString();
      const cardHeight = 110;
      const rowGap = 12;
      const pages: string[] = [];

      const cols = 2; // we render two columns per page
      const totalPerPage = rows * cols; // rows is rows per column

      for (let i = 0; i < codes.length; i += totalPerPage) {
        const pageCodes = codes.slice(i, i + totalPerPage);
        const left = pageCodes.slice(0, rows);
        const right = pageCodes.slice(rows, rows * cols);

        // ensure both columns have exactly `rows` elements (fill with empty slots)
        while (left.length < rows) left.push('');
        while (right.length < rows) right.push('');

        const leftFront = left
          .map((code) => `
            <div class="voucher-row">
              <div class="card front ${code ? '' : 'empty'}">
                <div class="spine">
                  <div class="spine-text">bimo33 <span>VOUCHER</span></div>
                </div>
                <div class="content">
                  <div class="left">
                    <div class="price">$${price.toFixed(2)}</div>
                    <div class="logo"><img src="${BrandImg}" /></div>
                    <div class="brand">CREDITS CARD</div>
                  </div>
                  <div class="right">
                    <div class="title">bimo33 VOUCHER</div>
                    <div class="services">
                      HOW TO REDEEM<br/>
                      GOTO: My Profile -> Account tab<br/>
                      Enter 14 digit code in the back to redeem
                    </div>
                    <div class="meta">${includeAmount ? `${amount} USD ` : ''}Price $${price.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          `)
          .join('');

        const rightFront = right
          .map((code) => `
            <div class="voucher-row">
              <div class="card front ${code ? '' : 'empty'}">
                <div class="spine">
                  <div class="spine-text">bimo33 <span>VOUCHER</span></div>
                </div>
                <div class="content">
                  <div class="left">
                    <div class="price">$${price.toFixed(2)}</div>
                    <div class="logo"><img src="${BrandImg}" /></div>
                    <div class="brand">CREDITS CARD</div>
                  </div>
                  <div class="right">
                    <div class="title">bimo33 VOUCHER</div>
                    <div class="services">
                      HOW TO REDEEM<br/>
                      GOTO: My Profile -> Account tab<br/>
                      Enter 14 digit code in the back to redeem
                    </div>
                    <div class="meta">${includeAmount ? `${amount} USD ` : ''}Price $${price.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          `)
          .join('');

        const frontHtml = `
          <div class="page front-page">
            <div class="columns">
              <div class="column">${leftFront}</div>
              <div class="column">${rightFront}</div>
            </div>
          </div>
        `;

        // BACK: same positions and order — rotate entire back page for long-edge duplex printing
        const leftBack = left
          .map((code) => `
            <div class="voucher-row">
              <div class="card back ${code ? '' : 'empty'}">
                <div class="pattern"></div>
                <div class="code-overlay">${code || ''}</div>
              </div>
            </div>
          `)
          .join('');

        const rightBack = right
          .map((code) => `
            <div class="voucher-row">
              <div class="card back ${code ? '' : 'empty'}">
                <div class="pattern"></div>
                <div class="code-overlay">${code || ''}</div>
              </div>
            </div>
          `)
          .join('');

        const backHtml = `
          <div class="page back-page">
            <div class="columns">
              <div class="column">${leftBack}</div>
              <div class="column">${rightBack}</div>
            </div>
          </div>
        `;

        pages.push(frontHtml);
        pages.push(backHtml);
      }

      const style = `
        @page { size: A4; margin: 8mm; }
        body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont; margin: 0; color: #111; -webkit-print-color-adjust: exact; }

        .page { page-break-after: always; display:block; padding: 8px; }
        .columns { display:flex; gap:12px; }
        .column { flex:1; display:flex; flex-direction:column; gap: ${rowGap}px; }
        .voucher-row { display:block; height: ${cardHeight}px; }

        .card { height:100%; border-radius: 12px; overflow: hidden; display: flex; box-shadow: 0 4px 10px rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.06); }
        .card.empty { background: transparent; border: none; box-shadow: none; }

        .card.front { display:flex; background: linear-gradient(#f6f6f6, #ececec); }
        .card.back { display:flex; background-color: #fffdf6; position: relative; align-items:center; justify-content:center; }

        .spine { width: 60px; background: #fff; border-right: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; }
        .spine-text { writing-mode: vertical-rl; transform: rotate(180deg); font-weight: 800; letter-spacing: 2px; font-size: 12px; text-align: center; }
        .spine-text span { color: #e11d2a; }

        .content { flex: 1; display: flex; }
        .left { width: 55%; display: flex; align-items: center; gap: 14px; padding: 0 16px; }
        .price { background: #111; color: #fff; padding: 6px 10px; font-weight: 800; border-radius: 6px; font-size: 12px; }
        .logo img { width: 100px; }
        .brand { font-weight: 700; letter-spacing: 2px; font-size: 14px; text-align: center; }

        .right { width: 45%; background: #e11d2a; color: #fff; padding: 10px 14px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
        .title { font-size: 16px; font-weight: 800; }
        .services { font-size: 10px; line-height: 1.4; }
        .meta { font-size: 10px; opacity: 0.95; margin-top: 2px; }

        .card.back::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-conic-gradient(from 45deg, rgba(214,192,138,0.18), rgba(214,192,138,0.18) 15deg, transparent 15deg, transparent 30deg);
          background-size: 30px 30px;
        }
        .card.back::after { content: ""; position: absolute; inset: 10px; border-radius: 12px; }

        .code-overlay { font-family: 'Courier New', monospace; font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #ffffff; background: #5fada9; padding: 6px 8px; border-radius: 8px; text-shadow: 0 1px 2px rgba(0,0,0,0.35); position: relative; display: inline-block; }

        /* Rotate back page for duplex long-edge flipping */
        .back-page { transform: rotate(180deg); transform-origin: center; }

        @media print {
          body { -webkit-print-color-adjust: exact; }
          .page { page-break-after: always; }
          .column { -webkit-column-break-inside: avoid; column-break-inside: avoid; }
        }
      `;

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Voucher Cards</title>
            <style>${style}</style>
          </head>
          <body>

            ${pages.join("")}
            <script>
              window.onload = () => setTimeout(() => window.print(), 200);
            </script>
          </body>
        </html>
      `;

      const w = window.open('', '_blank');
      if (!w) return toast.error('Popup blocked');
      w.document.write(html);
      w.document.close();
      w.focus();
    } catch (e) {
      console.error(e);
      toast.error('Print failed');
    }
  };

  return (
    <div className="mt-6 p-4 rounded-xl bg-secondary/20 border border-white/5">
      <h4 className="font-semibold mb-2 text-sky-500">Admin — Generate Voucher Cards</h4>
      <p className="text-sm text-muted-foreground mb-3">Create 14-digit voucher codes for printing. Codes are stored hashed server-side.</p>

      <div className="flex items-end gap-4 mb-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-xs text-muted-foreground">Amount</label>
          <input id="amount" type="number" className="rounded px-2 py-1 bg-background border" value={amount} onChange={e => setAmount(Number(e.target.value))} min={1} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="quantity" className="text-xs text-muted-foreground">Quantity</label>
          <input id="quantity" type="number" className="rounded px-2 py-1 bg-background border" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} max={1000} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="price" className="text-xs text-muted-foreground">Price</label>
          <input id="price" type="number" step="0.01" className="rounded px-2 py-1 bg-background border w-28" value={price} onChange={e => setPrice(Number(e.target.value))} min={0} />
        </div>

        <Button size="sm" variant="accent" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {codes.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Plain codes (copy for printing). Keep these secure — they cannot be recovered once lost.</p>

          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-muted-foreground">Rows per column:</label>
            <select className="rounded px-2 py-1 bg-background border" value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>

            <label className="ml-4 text-xs">
              <input type="checkbox" checked={includeAmount} onChange={e => setIncludeAmount(e.target.checked)} className="mr-1" /> Include amount
            </label>
          </div>

          <textarea readOnly className="w-full p-2 rounded bg-background border text-sm font-mono" rows={Math.min(8, Math.ceil(codes.length / 2))} value={codes.join('\n')} />

          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(codes.join('\n')); toast.success('Copied codes to clipboard'); }}>Copy</Button>
            <Button size="sm" variant="outline" onClick={() => printCards(codes, amount, price, rowsPerPage, includeAmount)}>Print / Export PDF</Button>
            <Button size="sm" variant="ghost" onClick={() => setCodes([])}>Clear</Button>
          </div>
        </div>
      )}
    </div>
  );
}
