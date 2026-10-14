// ==UserScript==
// @name         canvas2pdf
// @namespace    https://github.com/WY-74/Tampermonkey-canvas2pdf
// @version      1.0.0
// @description  A Tampermonkey script for batch exporting PDF.js rendered pages to image-based PDF files.
// @author       Yun Wang
// @match        https://example.com/pdf/viewer/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

/* global PDFViewerApplication */

(function () {
    'use strict';

    // ========== 手动设置总页数 ==========
    const TOTAL_PAGES = 1000;   // 如果实际大于1000，改成正确值

    const POLL_INTERVAL = 500;
    const MAX_WAIT = 30000;    // 单页最长等 30 秒（分片加载慢）

    // ---------- 加载 jsPDF ----------
    function loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jspdf && window.jspdf.jsPDF) return resolve(window.jspdf.jsPDF);
            const urls = [
                'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
                'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
            ];
            let i = 0;
            (function next() {
                if (i >= urls.length) return reject(new Error('jsPDF 加载失败'));
                const s = document.createElement('script');
                s.src = urls[i++];
                s.onload = () => (window.jspdf && window.jspdf.jsPDF) ? resolve(window.jspdf.jsPDF) : next();
                s.onerror = next;
                document.head.appendChild(s);
            })();
        });
    }

    function waitForViewer(cb) {
        const t = setInterval(() => {
            if (window.PDFViewerApplication && window.PDFViewerApplication.pdfViewer) {
                clearInterval(t);
                cb();
            }
        }, 1000);
    }

    // ---------- 跳页 ----------
    function goToPage(n) {
        return new Promise((resolve) => {
            try {
                PDFViewerApplication.page = n;
            } catch (e) {
                console.warn('设置 page=' + n + ' 出错:', e);
            }
            setTimeout(resolve, 1000); // 多等一会，让分片开始加载
        });
    }

    // ---------- 等 canvas 渲染完 ----------
    async function waitForCanvas(pageNum) {
        const pdfViewer = PDFViewerApplication.pdfViewer;
        const start = Date.now();

        while (Date.now() - start < MAX_WAIT) {
            const pageView = pdfViewer.getPageView(pageNum - 1);
            if (pageView && pageView.canvas &&
                pageView.canvas.width > 0 && pageView.canvas.height > 0 &&
                pageView.renderingState === 3) {
                return pageView.canvas;
            }
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
        return null;
    }

    // ---------- 导出批次 ----------
    async function exportBatch(startPage, endPage, jsPDF) {
        let pdf = null;
        let success = 0;
        const failed = [];

        console.log('===== 开始导出 =====');
        console.log('起始页:', startPage, '结束页:', endPage, '总页数设定:', TOTAL_PAGES);
        console.log('PDFViewerApplication.pagesCount =', PDFViewerApplication.pagesCount);

        // 通过 endPage 和 TOTAL_PAGES完成循环
        for (let p = startPage; p <= endPage; p++) {
            if (p > TOTAL_PAGES) {
                console.log('超过 TOTAL_PAGES(' + TOTAL_PAGES + ')，结束循环');
                break;
            }

            console.log('>>> 正在处理第 ' + p + ' 页');

            await goToPage(p);
            const canvas = await waitForCanvas(p);

            if (!canvas) {
                console.warn('第 ' + p + ' 页等待超时，跳过');
                failed.push(p);
                continue;
            }

            try {
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const w = canvas.width, h = canvas.height;
                if (!pdf) {
                    pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'px', format: [w, h] });
                } else {
                    pdf.addPage([w, h], w > h ? 'landscape' : 'portrait');
                }
                pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
                success++;
                console.log('✅ 第 ' + p + ' 页成功，累计 ' + success);
            } catch (e) {
                console.error('❌ 第 ' + p + ' 页 toDataURL 失败:', e);
                failed.push(p);
            }
        }

        console.log('===== 循环结束 =====');
        console.log('成功:', success, '失败:', failed);

        if (pdf && success > 0) {
            pdf.save('导出_' + startPage + '-' + endPage + '.pdf');
            return { success, failed };
        } else {
            throw new Error('本批没有导出任何页。失败页：' + failed.join(','));
        }
    }

    // ---------- UI ----------
    function addUI(jsPDF) {
        const box = document.createElement('div');
        box.style.cssText = `position:fixed;right:20px;bottom:20px;z-index:99999;background:#fff;border:1px solid #ccc;border-radius:8px;padding:12px;box-shadow:0 2px 10px rgba(0,0,0,.2);font-size:13px;width:260px;`;
        box.innerHTML = `
            <div style="font-weight:bold;margin-bottom:8px;">Canvas2pdf（当前支持最大页数 ${TOTAL_PAGES}）</div>
            <div>起始页：<input id="expStart" type="number" value="1" style="width:60px"></div>
            <div style="margin-top:4px;">结束页：<input id="expEnd" type="number" value="30" style="width:60px"></div>
            <button id="expBtn" style="margin-top:8px;width:100%;padding:6px;background:#1976d2;color:#fff;border:none;border-radius:4px;cursor:pointer;">开始导出本批</button>
            <div id="expMsg" style="margin-top:6px;color:#666;"></div>
        `;
        document.body.appendChild(box);

        document.getElementById('expBtn').onclick = async () => {
            const start = parseInt(document.getElementById('expStart').value);
            const end = parseInt(document.getElementById('expEnd').value);
            const msg = document.getElementById('expMsg');
            const btn = document.getElementById('expBtn');
            if (isNaN(start) || isNaN(end) || start < 1 || end < start) return alert('页码不正确');

            btn.disabled = true;
            msg.textContent = '正在导出 ' + start + ' - ' + end + '…';
            try {
                const r = await exportBatch(start, end, jsPDF);
                msg.textContent = '完成，成功 ' + r.success + ' 页' + (r.failed.length ? '，失败：' + r.failed.join(',') : '');
            } catch (e) {
                console.error(e);
                msg.textContent = '出错：' + e.message;
            }
            btn.disabled = false;
        };
    }

    loadJsPDF()
        .then(jsPDF => {
            console.log('[导出] jsPDF OK');
            waitForViewer(() => {
                addUI(jsPDF);
            });
        })
        .catch(e => alert('jsPDF 加载失败：' + e.message));
})();
