import re

with open('client/src/pages/Admin.tsx', 'r') as f:
    content = f.read()

# Update form state
content = content.replace(
    '    languages: "",',
    '    targetLanguage: "",\n    sourceLanguage: "English",\n    zipCode: "",'
)

# Update resetForm
content = re.sub(
    r'languages: "",\n      specialties:',
    'targetLanguage: "",\n      sourceLanguage: "English",\n      zipCode: "",\n      specialties:',
    content
)

# Update handleEdit
content = re.sub(
    r'languages: interpreter\.languages \? JSON\.parse\(interpreter\.languages\)\.join\(", "\) : "",',
    'targetLanguage: interpreter.targetLanguage || "",\n      sourceLanguage: interpreter.sourceLanguage || "English",\n      zipCode: interpreter.zipCode || "",',
    content
)

# Update handleSubmitCreate
content = re.sub(
    r'const languages = formData\.languages\.split\(","\)\.map\(\(l\) => l\.trim\(\)\)\.filter\(Boolean\);',
    '// Languages now use targetLanguage',
    content
)

# Update mutation calls
content = re.sub(
    r'      languages,\n',
    '      targetLanguage: formData.targetLanguage,\n      sourceLanguage: formData.sourceLanguage,\n      zipCode: formData.zipCode,\n',
    content
)

# Update form field
content = re.sub(
    r'<Label htmlFor="languages">Languages \* \(comma-separated\)</Label>',
    '<Label htmlFor="targetLanguage">Target Language *</Label>',
    content
)

content = re.sub(
    r'id="languages"',
    'id="targetLanguage"',
    content
)

content = re.sub(
    r'value={formData\.languages}',
    'value={formData.targetLanguage}',
    content
)

content = re.sub(
    r'languages: e\.target\.value',
    'targetLanguage: e.target.value',
    content
)

content = re.sub(
    r'!formData\.languages',
    '!formData.targetLanguage',
    content
)

content = re.sub(
    r'placeholder="Spanish, English, French"',
    'placeholder="Spanish"',
    content
)

# Update table display
old_table_cell = '''                    interpreters.map((interpreter: any) => {
                      let languages: string[] = [];
                      try {
                        if (interpreter.languages) {
                          languages = JSON.parse(interpreter.languages);
                        }
                      } catch (e) {
                        // ignore
                      }

                      return (
                        <TableRow key={interpreter.id}>
                          <TableCell className="font-medium">
                            {interpreter.firstName} {interpreter.lastName}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {languages.slice(0, 2).map((lang) => (
                                <Badge key={lang} variant="secondary" className="text-xs">
                                  {lang}
                                </Badge>
                              ))}
                              {languages.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{languages.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>'''

new_table_cell = '''                    interpreters.map((interpreter: any) => (
                        <TableRow key={interpreter.id}>
                          <TableCell className="font-medium">
                            {interpreter.firstName} {interpreter.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {interpreter.targetLanguage || "-"}
                            </Badge>
                          </TableCell>'''

content = content.replace(old_table_cell, new_table_cell)

# Remove extra closing
content = content.replace('\n                      return (', '')
content = content.replace('\n                      );', '')

with open('client/src/pages/Admin.tsx', 'w') as f:
    f.write(content)

print("Admin.tsx updated successfully")
