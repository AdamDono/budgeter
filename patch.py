import re

with open('src/pages/LandingPage.jsx', 'r') as f:
    text = f.read()

# Fix the duplicate 'for the' if it happened
text = text.replace("specifically for the the financial landscape.", "specifically for the financial landscape.")

with open('src/pages/LandingPage.jsx', 'w') as f:
    f.write(text)
