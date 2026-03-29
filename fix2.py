import re

filepath = 'c:/app.py/frontend/visu.py'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

def condense_html(match):
    prefix = match.group(1)
    content = match.group(2)
    suffix = match.group(3)
    
    # Check if this looks like SQL or python code. If so, don't touch.
    if "SELECT " in content or "def " in content or "import " in content:
        return match.group(0)
    
    # Strip leading/trailing spaces and newlines
    lines = [line.strip() for line in content.split('\n')]
    
    # Rejoin with a single space to prevent words from mushing together
    condensed = ' '.join(line for line in lines if line)
    
    return prefix + condensed + suffix

# Fix st.markdown(..., unsafe_allow_html=True)
text = re.sub(
    r'(st\.markdown\([f]?\"\"\")(.*?)(\"\"\",\s*unsafe_allow_html=True\))',
    condense_html,
    text,
    flags=re.DOTALL
)

# Fix return f"""...""" for helper functions returning HTML
text = re.sub(
    r'(return f\"\"\")(.*?)(\"\"\")',
    condense_html,
    text,
    flags=re.DOTALL
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("HTML strings condensed.")
