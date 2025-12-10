#!/bin/bash
cd /home/ubuntu/interpreter-database

# Use sed to update Admin.tsx
sed -i 's/languages: "",/targetLanguage: "",\n      sourceLanguage: "English",\n      zipCode: "",/g' client/src/pages/Admin.tsx
sed -i 's/languages: interpreter\.languages ? JSON\.parse(interpreter\.languages)\.join(", ") : "",/targetLanguage: interpreter.targetLanguage || "",\n      sourceLanguage: interpreter.sourceLanguage || "English",\n      zipCode: interpreter.zipCode || "",/g' client/src/pages/Admin.tsx
sed -i 's/const languages = formData\.languages\.split(",")\.map((l) => l\.trim())\.filter(Boolean);/\/\/ Languages now use targetLanguage field/g' client/src/pages/Admin.tsx
sed -i 's/languages,/targetLanguage: formData.targetLanguage,\n        sourceLanguage: formData.sourceLanguage,\n        zipCode: formData.zipCode,/g' client/src/pages/Admin.tsx
sed -i 's/let languages: string\[\] = \[\];/\/\/ Display target language/g' client/src/pages/Admin.tsx
sed -i '/try {$/,/} catch (e) {$/d' client/src/pages/Admin.tsx
sed -i 's/{languages\.slice(0, 2)\.map((lang) =>/{interpreter.targetLanguage ? [interpreter.targetLanguage].map((lang) =>/g' client/src/pages/Admin.tsx
sed -i 's/{languages\.length > 2 &&/{false &&/g' client/src/pages/Admin.tsx
sed -i 's/id="languages"/id="targetLanguage"/g' client/src/pages/Admin.tsx
sed -i 's/value={formData\.languages}/value={formData.targetLanguage}/g' client/src/pages/Admin.tsx
sed -i 's/onChange={(e) => setFormData({ \.\.\.formData, languages: e\.target\.value })}/onChange={(e) => setFormData({ ...formData, targetLanguage: e.target.value })}/g' client/src/pages/Admin.tsx
sed -i 's/!formData\.languages/!formData.targetLanguage/g' client/src/pages/Admin.tsx
sed -i 's/<Label htmlFor="languages">Languages \* (comma-separated)<\/Label>/<Label htmlFor="targetLanguage">Target Language *<\/Label>/g' client/src/pages/Admin.tsx
sed -i 's/placeholder="Spanish, English, French"/placeholder="Spanish"/g' client/src/pages/Admin.tsx

echo "Admin.tsx updated"
