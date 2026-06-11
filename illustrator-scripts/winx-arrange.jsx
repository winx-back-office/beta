// winx-arrange.jsx — WINX Studio: arrange garment pattern pieces on a fabric strip
//
// Fabric runs horizontally (left -> right). Fabric WIDTH is the VERTICAL size on screen.
// Pieces are shelf-packed into columns: fill top-to-bottom, then move right.
// Same-size pieces can alternate 180-degree rotation (sleeve interleaving style).
//
// Manual use:  Illustrator > File > Scripts > Other Script... > pick this file
// Automated use: define a global WINX_OPTS object, then $.evalFile this file:
//   var WINX_OPTS = { fabricW:157, gap:1, altRotate:true, selOnly:false, previewPng:"/tmp/p.png" };
//
// The script never saves the document. Review the result, then save yourself.

var __winxReport = (function () {
    var CM = 72 / 2.54; // points per cm

    function addField(dlg, label, def) {
        var g = dlg.add("group");
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = 210;
        var e = g.add("edittext", undefined, def);
        e.characters = 8;
        return e;
    }

    function showDialog() {
        var dlg = new Window("dialog", "WINX Arrange Pieces");
        dlg.orientation = "column";
        dlg.alignChildren = "left";
        var eW = addField(dlg, "Fabric width (cm, vertical):", "157");
        var eG = addField(dlg, "Gap between pieces (cm):", "1");
        var cbR = dlg.add("checkbox", undefined, "Alternate 180° rotation for same-size pieces");
        cbR.value = true;
        var cbS = dlg.add("checkbox", undefined, "Arrange selected items only");
        cbS.value = (app.activeDocument.selection.length > 1);
        var gB = dlg.add("group");
        gB.alignment = "right";
        gB.add("button", undefined, "Cancel", { name: "cancel" });
        gB.add("button", undefined, "Arrange", { name: "ok" });
        if (dlg.show() !== 1) return null;
        return {
            fabricW: parseFloat(eW.text) || 157,
            gap: parseFloat(eG.text) || 0,
            altRotate: cbR.value,
            selOnly: cbS.value,
            previewPng: null
        };
    }

    function isFabricGuideLine(w, h) {
        // very long, very thin -> fabric edge marker line, leave it alone
        return (h < 2 * CM && w > 100 * CM) || (w < 2 * CM && h > 100 * CM);
    }

    function collectPieces(doc, selOnly) {
        var items = [];
        function consider(it) {
            try { if (it.locked || it.hidden) return; } catch (e) {}
            try { if (it.typename === "PathItem" && it.guides) return; } catch (e2) {}
            var vb = it.visibleBounds;
            var w = vb[2] - vb[0], h = vb[1] - vb[3];
            if (isFabricGuideLine(w, h)) return;
            if (w < 1 * CM && h < 1 * CM) return; // dust / stray points
            items.push(it);
        }
        if (selOnly) {
            for (var i = 0; i < doc.selection.length; i++) consider(doc.selection[i]);
        } else {
            for (var li = 0; li < doc.layers.length; li++) {
                var L = doc.layers[li];
                if (L.locked || !L.visible) continue;
                for (var j = 0; j < L.pageItems.length; j++) consider(L.pageItems[j]);
            }
        }
        return items;
    }

    function sizeKey(it) {
        var vb = it.visibleBounds;
        return Math.round((vb[2] - vb[0]) / CM) + "x" + Math.round((vb[1] - vb[3]) / CM);
    }

    function exportPreview(doc, rect, path) {
        var ab = doc.artboards.add(rect);
        var idx = doc.artboards.length - 1;
        doc.artboards.setActiveArtboardIndex(idx);
        app.redraw();
        var o = new ExportOptionsPNG24();
        o.artBoardClipping = true;
        o.transparency = false;
        var wPt = rect[2] - rect[0];
        var scale = Math.min(100, (1400 / wPt) * 100);
        o.horizontalScale = scale;
        o.verticalScale = scale;
        doc.exportFile(new File(path), ExportType.PNG24, o);
        doc.artboards.remove(idx);
        doc.artboards.setActiveArtboardIndex(0);
    }

    // ---- main ----
    if (app.documents.length === 0) return "ERROR: no document open";
    var doc = app.activeDocument;

    var opts = (typeof WINX_OPTS !== "undefined" && WINX_OPTS) ? WINX_OPTS : showDialog();
    if (!opts) return "CANCELLED";

    var fabricPt = opts.fabricW * CM;
    var gapPt = opts.gap * CM;

    var items = collectPieces(doc, opts.selOnly);
    if (items.length === 0) return "ERROR: no pieces found to arrange";

    // origin: keep the pieces roughly where the work area already is
    var minLeft = 1e12, maxTop = -1e12;
    var i, vb;
    for (i = 0; i < items.length; i++) {
        vb = items[i].visibleBounds;
        if (vb[0] < minLeft) minLeft = vb[0];
        if (vb[1] > maxTop) maxTop = vb[1];
    }

    // sort: tallest first, then widest; identical sizes end up adjacent
    items.sort(function (a, b) {
        var va = a.visibleBounds, vbb = b.visibleBounds;
        var ha = va[1] - va[3], hb = vbb[1] - vbb[3];
        if (Math.abs(hb - ha) > 0.5 * CM) return hb - ha;
        return (vbb[2] - vbb[0]) - (va[2] - va[0]);
    });

    var bottomLimit = maxTop - fabricPt;
    var xCur = minLeft, yCur = maxTop, colW = 0, columns = 1;
    var rotCount = {};
    var warnings = [];

    for (i = 0; i < items.length; i++) {
        var it = items[i];
        if (opts.altRotate) {
            var key = sizeKey(it);
            rotCount[key] = (rotCount[key] || 0) + 1;
            if (rotCount[key] % 2 === 0) it.rotate(180);
        }
        vb = it.visibleBounds;
        var w = vb[2] - vb[0], h = vb[1] - vb[3];
        if (h > fabricPt) warnings.push("piece " + (i + 1) + " is taller than fabric width (" + (h / CM).toFixed(1) + " cm)");
        if (yCur - h < bottomLimit && yCur !== maxTop) {
            xCur += colW + gapPt;
            yCur = maxTop;
            colW = 0;
            columns++;
        }
        it.translate(xCur - vb[0], yCur - vb[1]);
        if (w > colW) colW = w;
        yCur -= h + gapPt;
    }

    var endX = xCur + colW;
    var usedLen = (endX - minLeft) / CM;

    if (opts.previewPng) {
        try {
            exportPreview(doc, [minLeft - 2 * CM, maxTop + 2 * CM, endX + 2 * CM, bottomLimit - 2 * CM], opts.previewPng);
        } catch (ePrev) {
            warnings.push("preview export failed: " + ePrev);
        }
    }

    var msg = "ARRANGED: " + items.length + " pieces in " + columns + " columns\n" +
        "FABRIC WIDTH: " + opts.fabricW + " cm, GAP: " + opts.gap + " cm\n" +
        "USED LENGTH: " + usedLen.toFixed(1) + " cm" +
        (warnings.length ? "\nWARNINGS: " + warnings.join("; ") : "") +
        "\nDocument NOT saved - press Cmd+Z to undo, or save to keep.";

    if (typeof WINX_OPTS === "undefined" || !WINX_OPTS) alert(msg);
    return msg;
})();

__winxReport;
