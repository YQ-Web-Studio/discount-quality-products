import subprocess
import os

print("Deleting old result files...")
for filename in ["scratch/fix_and_generate_result.json", "scratch/fix_and_generate_result_v2.json", "scratch/stdout.log", "scratch/stderr.log"]:
    path = os.path.join(os.getcwd(), filename)
    if os.path.exists(path):
        os.remove(path)
        print(f"Deleted {filename}")

print("\nRunning node scratch/generate_feed_via_rest.js...")
result = subprocess.run(["node", "scratch/generate_feed_via_rest.js"], capture_output=True, text=True, encoding='utf-8')

# Write outputs to files
with open("scratch/stdout.log", "w", encoding="utf-8") as f:
    f.write(result.stdout if result.stdout else "")

with open("scratch/stderr.log", "w", encoding="utf-8") as f:
    f.write(result.stderr if result.stderr else "")

print("Saved logs to scratch/stdout.log and scratch/stderr.log")
