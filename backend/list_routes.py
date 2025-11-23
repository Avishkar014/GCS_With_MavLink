# list_routes.py — run from the same venv you use for uvicorn
import importlib, json, sys
spec = importlib.import_module("main")
app = getattr(spec, "app", None)
if app is None:
    print("NO_APP_OBJECT")
    sys.exit(1)

routes = []
for r in app.routes:
    routes.append({
        "path": getattr(r, "path", str(r)),
        "name": getattr(r, "name", ""),
        "methods": list(getattr(r, "methods", [])) if getattr(r, "methods", None) else None,
        "type": r.__class__.__name__
    })

print(json.dumps(routes, indent=2))
