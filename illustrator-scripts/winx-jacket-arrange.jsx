// winx-jacket-arrange.jsx
// จัดวางชิ้นแจ็คเก็ตตามชื่อ Layer:
//   ชิ้นหลัง   → กึ่งกลาง ชิดล่าง
//   ชิ้นหน้า ขวา → ชิดซ้าย ชิดล่าง
//   ชิ้นหน้า ซ้าย → ชิดขวา ชิดล่าง
//   แขนซ้าย    → หมุน 180° ชิดบน ชิดซ้าย
//   แขนขวา    → หมุน 180° ชิดบน ชิดขวา

(function () {
    if (app.documents.length === 0) { alert("ไม่มีไฟล์เปิดอยู่"); return; }

    var doc = app.activeDocument;
    var R   = doc.artboards[0].artboardRect; // [left, top, right, bottom] in points
    var abL = R[0], abT = R[1], abR = R[2], abB = R[3];

    // ค้นหา layer ที่ชื่อมี substring ที่กำหนด
    function findItem(sub) {
        for (var i = 0; i < doc.layers.length; i++) {
            var L = doc.layers[i];
            if (L.name.indexOf(sub) >= 0 && L.pageItems.length > 0)
                return L.pageItems[0];
        }
        return null;
    }

    // คืน bounding box ของ item
    function vb(item) {
        var b = item.visibleBounds; // [left, top, right, bottom]
        return { l: b[0], t: b[1], r: b[2], b: b[3],
                 w: b[2] - b[0], h: b[1] - b[3] };
    }

    var frontR = findItem("หน้า ขวา");
    var frontL = findItem("หน้า ซ้าย");
    var back   = findItem("ชิ้นหลัง");
    var armL   = findItem("แขนซ้าย");
    var armR   = findItem("แขนขวา");

    var missing = [];
    if (!frontR) missing.push("ชิ้นหน้า ขวา");
    if (!frontL) missing.push("ชิ้นหน้า ซ้าย");
    if (!back)   missing.push("ชิ้นหลัง");
    if (!armL)   missing.push("แขนซ้าย");
    if (!armR)   missing.push("แขนขวา");
    if (missing.length) {
        alert("หา layer ไม่เจอ:\n" + missing.join(", ") +
              "\n\nกรุณาตรวจสอบชื่อ Layer ใน Layers panel");
        return;
    }

    // หมุน แขน 180°
    armL.rotate(180);
    armR.rotate(180);

    // ---- วาง body ที่ล่าง ----

    // ชิ้นหน้าขวา: ชิดซ้าย ชิดล่าง
    var b = vb(frontR);
    frontR.position = [abL, abB + b.h];

    // ชิ้นหลัง: กึ่งกลาง ชิดล่าง
    b = vb(back);
    back.position = [abL + ((abR - abL) - b.w) / 2, abB + b.h];

    // ชิ้นหน้าซ้าย: ชิดขวา ชิดล่าง
    b = vb(frontL);
    frontL.position = [abR - b.w, abB + b.h];

    // ---- วาง แขน ที่บน (หมุนแล้ว) ----

    // แขนซ้าย: ชิดบน ชิดซ้าย
    b = vb(armL);
    armL.position = [abL, abT];

    // แขนขวา: ชิดบน ชิดขวา
    b = vb(armR);
    armR.position = [abR - b.w, abT];

    alert("จัดวางเสร็จแล้ว!\n\nไฟล์ยังไม่ถูก Save — กด Cmd+Z เพื่อ Undo หรือ Cmd+S เพื่อ Save");
})();
