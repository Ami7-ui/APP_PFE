
import re

filepath = 'c:/app.py/frontend/visu.py'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the incorrect f"""\ <div and f"""\ <style
text = text.replace('f\"\"\"\\ <div', 'f\"\"\"<div')
text = text.replace('f\"\"\"\\ <span', 'f\"\"\"<span')
text = text.replace('\"\"\"\\ <style', '\"\"\"<style')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print('Syntax Fixed')
