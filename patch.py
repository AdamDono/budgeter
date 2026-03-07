with open('src/styles/landing.css', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.startswith('  ') and not line.startswith('    ') and line.endswith('{\n') and i > 1086 and i < 1160:
        new_lines.append(line)
    elif line.startswith('      ') and i > 1086 and i < 1160:
         new_lines.append('    ' + line.strip() + '\n')
    else:
        new_lines.append(line)

with open('src/styles/landing.css', 'w') as f:
    f.writelines(new_lines)
