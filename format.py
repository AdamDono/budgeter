with open('src/styles/landing.css', 'r') as f:
    text = f.read()

import re
# Fix the right curly brace indentation that got broken
text = re.sub(r'\n    \}', '\n  }', text)

with open('src/styles/landing.css', 'w') as f:
    f.write(text)
