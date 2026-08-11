import os
import tempfile

# Settings load DUO_DB_PATH at import time, so point it at an isolated,
# throwaway file before any test imports duo_server.config / duo_server.main.
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ.setdefault("DUO_DB_PATH", _tmp_db.name)
