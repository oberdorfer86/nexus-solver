from pathlib import Path
p=Path(r"d:/Projetos VSCode/NEXUS Solver V1.42/app/static/js/main.js")
s=p.read_text()
open_count=0
for i,line in enumerate(s.splitlines(), start=1):
    o=line.count('{')
    c=line.count('}')
    open_count += o-c
    if o or c:
        print(f"{i:04d}: +{o} -{c} => balance {open_count}")
print('\nFINAL BALANCE:', open_count)
