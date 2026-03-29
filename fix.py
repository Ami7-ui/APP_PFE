import re
import os

filepath = 'c:/app.py/frontend/visu.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

def dedenter(m):
    prefix = m.group(1)
    body = m.group(2)
    suffix = m.group(3)
    dedented_body = '\n'.join([line.lstrip() for line in body.split('\n')])
    return prefix + dedented_body + suffix

# Fix st.markdown
content = re.sub(r'(st\.markdown\([f]?\"\"\" \s* \\? \n)(.*?)(\"\"\",\s*unsafe_allow_html=True\))', dedenter, content, flags=re.DOTALL | re.VERBOSE)

# Fix return f"""
content = re.sub(r'(return f\"\"\" \s* \\? \n)(.*?)(\"\"\")', dedenter, content, flags=re.DOTALL | re.VERBOSE)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fix applied.")
