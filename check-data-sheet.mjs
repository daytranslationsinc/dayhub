import XLSX from "xlsx";

const workbook = XLSX.readFile("/home/ubuntu/FINAL_Comprehensive_All_56_Metros/MASTER_All_56_Metros_Complete.xlsx");

// Skip summary sheet, check first data sheet
const dataSheet = workbook.Sheets[workbook.SheetNames[1]];
const data = XLSX.utils.sheet_to_json(dataSheet);

console.log("Data sheet:", workbook.SheetNames[1]);
console.log("Total rows:", data.length);
console.log("\nColumn names:");
if (data[0]) {
  console.log(Object.keys(data[0]));
}
console.log("\nFirst row sample:");
console.log(JSON.stringify(data[0], null, 2));
