import json, sys
a = sys.argv[1] if len(sys.argv) > 1 else "out/ricks/medidas_ricks.json"
b = sys.argv[2] if len(sys.argv) > 2 else "out/ricks/medidas_nuestro.json"
R = json.load(open(a, encoding="utf8"))["resumen"]; N = json.load(open(b, encoding="utf8"))["resumen"]
for k in R:
    if k not in N:
        continue
    if k in ("dibujo_dura_cuadros_hist", "grid_local_%"):
        print(k, R[k], "|", N[k]); continue
    r, n = R[k], N[k]
    print(f"{k:34s} RICKS {r['mediana']:>9} [{r['p25']}-{r['p75']}]   NUESTRO {n['mediana']:>9} [{n['p25']}-{n['p75']}]")
