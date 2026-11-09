import base64
from pathlib import Path

txt_path = Path(r"C:\Users\PC\.gemini\antigravity\brain\0913054f-8393-48b7-9bca-9ab02b6e532a\.system_generated\steps\566\output.txt")
out_path = Path(r"C:\Users\PC\.gemini\antigravity\brain\0913054f-8393-48b7-9bca-9ab02b6e532a\superposition_verification.png")

raw = txt_path.read_text(encoding="utf-8").strip('"\n\r ')
b64_str = raw.split("base64,")[1]
data = base64.b64decode(b64_str)
out_path.write_bytes(data)
print(f"Decoded {len(data)} bytes to {out_path}")
