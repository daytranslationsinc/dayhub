import XLSX from "xlsx";

const workbook = XLSX.readFile("/home/ubuntu/FINAL_Comprehensive_All_56_Metros/MASTER_All_56_Metros_Complete.xlsx");
console.log("Sheets:", workbook.SheetNames.slice(0, 5));

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet);

console.log("\nFirst sheet:", workbook.SheetNames[0]);
console.log("Total rows:", data.length);
console.log("\nColumn names:");
if (data[0]) {
  console.log(Object.keys(data[0]));
}
console.log("\nFirst 2 rows:");
console.log(JSON.stringify(data.slice(0, 2), null, 2));
