function extractFields(query) {
  const fields = [];

  function recurse(obj) {
    if (typeof obj !== "object" || obj === null) {
      return;
    }

    for (const key in obj) {
      if (key === "$select" && Array.isArray(obj[key])) {
        // Nếu là $select -> Thêm tất cả fields trong mảng
        fields.push(...obj[key]);
      } else if (key === "$sort" && typeof obj[key] === "object") {
        // Nếu là $sort -> Lấy các keys từ object
        fields.push(...Object.keys(obj[key]));
      } else if (key === "$facet" && typeof obj[key] === "object") {
        // Nếu là $facet -> Lấy các fields trong $facet
        for (const subKey in obj[key]) {
          if (obj[key][subKey]?.field) {
            fields.push(obj[key][subKey].field);
          }
        }
      } else if (!key.startsWith("$")) {
        // Nếu không phải toán tử -> Thêm key vào fields
        fields.push(key);
        recurse(obj[key]); // Tiếp tục duyệt vào bên trong
      } else {
        // Xử lý các trường hợp khác ($and, $or, ...)
        recurse(obj[key]);
      }
    }
  }

  recurse(query);
  return [...new Set(fields)]; // Loại bỏ trùng lặp
}

module.exports = {
  extractFields,
};
