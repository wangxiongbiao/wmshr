export function printElement(elementId: string, docTitle: string): void {
  const element = document.getElementById(elementId);
  const printContent = element?.outerHTML;
  if (!printContent) return;

  const win = window.open("", "_blank");
  if (!win) return;

  // Get all style sheets and link elements from parent document to ensure 100% exact style matching
  const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join("\n");

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <base href="${window.location.origin}/">
        <title>${docTitle}</title>
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: 0; /* Set page margin to 0 to completely hide browser default headers (date, title) and footers (URL, page numbers) */
          }
          @media print {
            body { 
              display: block !important;
              background: white !important; 
              color: black !important; 
              padding: 10mm !important; /* Re-establish a clean page margin inside the document body to prevent elements touching the paper edges */
              margin: 0 !important;
              min-height: 0 !important;
              height: auto !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            
            /* Override parent's body display none under @media print */
            body > * {
              display: none !important;
            }
            
            /* Force display of the print container root wrapper in normal flow */
            #print-container-root {
              display: block !important;
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: white !important;
              transform: scale(0.95) !important;
              transform-origin: top center !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* Ensure the card fills the A4 page perfectly without margins on printing, but preserves beautiful spaciousness */
            #modal-live-preview-pane, #invoice-view-card {
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              border: 1px solid #cbd5e1 !important;
              border-top: 8px solid #4f46e5 !important;
              border-radius: 12px !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: 0 !important; /* Explicitly reset and override min-h-[1000px] */
              height: auto !important;
              padding: 2.5rem !important; /* Retain the beautiful, spacious premium padding (p-10) of the live preview */
              box-sizing: border-box !important;
              margin: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* Keep grid side-by-side */
            .grid {
              display: grid !important;
            }
            
            /* Ensure grids in print are incredibly tight and beautiful */
            div[class*="grid-cols-[auto_1fr]"] {
              display: grid !important;
              grid-template-columns: auto 1fr !important;
              row-gap: 2px !important; /* Force tight row gap for data lists */
              column-gap: 8px !important;
              line-height: 1.25 !important; /* Tight leading */
            }
            div[class*="grid-cols-[auto_1fr]"] span {
              line-height: 1.25 !important;
            }
            div[class*="grid-cols-[auto_auto]"] {
              display: grid !important;
              grid-template-columns: auto auto !important;
              row-gap: 2px !important;
              column-gap: 6px !important;
              line-height: 1.25 !important;
            }
            div[class*="grid-cols-[auto_auto]"] span {
              line-height: 1.25 !important;
            }
            p {
              margin: 0 !important;
              padding: 0 !important;
            }
            /* Tighten space-y utilities in print */
            div[class*="space-y-1"] > :not([hidden]) ~ :not([hidden]) {
              margin-top: 2px !important;
            }
            .mt-0\\.5 {
              margin-top: 2px !important;
            }
          }
          
          /* Screen preview styling: beautiful Centered Slate-100 card preview */
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Microsoft YaHei", "微软雅黑", "Noto Sans SC", "Noto Sans Thai", sans-serif;
            padding: 2rem;
            background-color: #f1f5f9; /* Slate 100 */
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100% !important;
          }
          #print-container-root {
            display: block !important; /* CRITICAL: overrides the hidden style in index.css for the temporary print window */
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
          }
          #modal-live-preview-pane, #invoice-view-card {
            background-color: #ffffff;
            padding: 2.5rem; /* matches p-10 */
            border-top: 8px solid #4f46e5; /* border-t-8 border-indigo-600 */
            border-left: 1px solid #cbd5e1; /* border border-slate-200 */
            border-right: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            border-radius: 12px; /* rounded-xl */
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
            width: 100%;
            box-sizing: border-box;
          }
          
          /* Explicitly hide any script elements from being displayed as block! */
          script {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div id="print-container-root">
          ${printContent}
        </div>
        <script>
          function startPrint() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
          
          // Wait for all stylesheets to load before printing
          const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
          let loaded = 0;
          if (links.length === 0) {
            setTimeout(startPrint, 600);
          } else {
            links.forEach(link => {
              link.onload = function() {
                loaded++;
                if (loaded === links.length) {
                  setTimeout(startPrint, 400);
                }
              };
              link.onerror = function() {
                loaded++;
                if (loaded === links.length) {
                  setTimeout(startPrint, 400);
                }
              };
            });
            // absolute fallback
            setTimeout(startPrint, 1500);
          }
        </script>
      </body>
    </html>
  `);
  win.document.close();
}
