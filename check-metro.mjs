import XLSX from "xlsx";

const file = "/home/ubuntu/FINAL_Comprehensive_All_56_Metros/Atlanta-Sandy_Springs-Roswell_GA.xlsx";
const workbook = XLSX.readFile(file);

console.log("Sheets:", workbook.SheetNames);

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet);

console.log("\nTotal rows:", data.length);
console.log("\nColumns:");
if (data[0]) {
  Object.keys(data[0]).forEach(key => console.log(`  - ${key}`));
}
console.log("\nSample row:");
console.log(JSON.stringify(data[0], null, 2));
