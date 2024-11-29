const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const qs = require("qs");
const xlsx = require("xlsx");
const { extractFields } = require("./extractFields");

const excludes = [
  "http://api-testing.ynm.local/crisis/crisis-user-notifications",
];
const MODULES = "Crisis";

function processMultipleHarsToExcel(harFiles, outputExcelPath) {
  const excelData = [
    [
      "Module",
      "Endpoint",
      "Is Priority?",
      "Select Fields",
      "Update Fields",
      "Notes",
    ],
  ];

  harFiles.forEach((harFilePath) => {
    let harData;
    try {
      const rawHar = fs.readFileSync(harFilePath, "utf-8");
      harData = JSON.parse(rawHar);
    } catch (error) {
      console.error(
        `Lỗi khi đọc hoặc phân tích tệp HAR (${harFilePath}):`,
        error.message
      );
      return;
    }

    const entries = harData.log.entries;

    entries.forEach((entry) => {
      const { request } = entry;
      const method = request.method;
      const url = new URL(request.url);

      if (!_.startsWith(url, "http://api-testing.ynm.local/crisis")) {
        return;
      }

      if (excludes.includes(url.href)) {
        return;
      }

      if (method === "GET") {
        const query = qs.parse(url.searchParams.toString());
        const fields = extractFields(query);

        excelData.push([
          MODULES,
          url.pathname,
          "Yes",
          fields.join(", "),
          "",
          method,
        ]);
      }

      if (method === "POST" || method === "PUT") {
        let postData = null;
        if (request.postData && request.postData.text) {
          try {
            postData = JSON.parse(request.postData.text);
          } catch (e) {
            postData = request.postData.text;
          }
        }

        const obb = qs.parse(url.searchParams.toString());
        const selectFields = extractFields(obb).join(", ");
        excelData.push([
          MODULES,
          url.pathname,
          "Yes",
          selectFields,
          JSON.stringify(postData),
          method,
        ]);
      }
    });
  });

  const uniqueExcelData = _.uniqWith(excelData, (c1, c2) => {
    const [module, endpoint, priority, selectFields, updateFields, note] = c1;
    const [module2, endpoint2, priority2, selectFields2, updateFields2, note2] =
      c2;
    return endpoint === endpoint2 && note === note2;
  });
  try {
    const worksheet = xlsx.utils.aoa_to_sheet(uniqueExcelData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "API Logs");

    xlsx.writeFile(workbook, outputExcelPath);
    console.log(`Excel đã được tạo tại: ${outputExcelPath}`);
  } catch (error) {
    console.error("Lỗi khi ghi tệp Excel:", error.message);
  }
}

const harFiles = [
  path.resolve("./extensions.har"),
  path.resolve("./keywords.har"),
  path.resolve("./keywords1.har"),
  path.resolve("./mentions.har"),
  path.resolve("./mentions1.har"),
  path.resolve("./processes.har"),
  path.resolve("./statistic.har"),
  path.resolve("./statistic1.har"),
];

const outputExcelPath = path.resolve(`./output/${Date.now()}output.xlsx`);

processMultipleHarsToExcel(harFiles, outputExcelPath);
