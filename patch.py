import os

filepath = 'tools/ingestion/engine.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix timeout
code = code.replace(
    'response = self.session.request(method, url, timeout=45, **kwargs)',
    'response = self.session.request(method, url, timeout=90, **kwargs)'
)

# Fix retries
old_retry = '''                if attempt == max_retries or getattr(e, "response", None) is None or getattr(e.response, "status_code", 0) not in (503, 504):
                    return None'''
new_retry = '''                if attempt < max_retries:
                    if getattr(e, "response", None) is None or getattr(e.response, "status_code", 0) in (502, 503, 504):
                        self.log.info("  Retrying API call (%d/%d)...", attempt + 1, max_retries)
                        import time
                        time.sleep(2 ** attempt)
                        continue
                return None'''
code = code.replace(old_retry, new_retry)

# Open failed log file
old_start = '''    start_time = time.time()'''
new_start = '''    failed_log_fh = open(_SCRIPT_DIR / "failed_skus_to_review.log", "w", encoding="utf-8")
    start_time = time.time()'''
code = code.replace(old_start, new_start)

# Write to failed log on process_row fail
old_fail1 = '''                elif result == "failed":
                    counters["failed"] += 1'''
new_fail1 = '''                elif result == "failed":
                    counters["failed"] += 1
                    failed_log_fh.write(f"SKU: {sku}\\n")
                    failed_log_fh.flush()'''
code = code.replace(old_fail1, new_fail1)

# Write to failed log on exception fail
old_fail2 = '''                logger.error(err_msg)
                recent_logs.append(err_msg)
                counters["failed"] += 1'''
new_fail2 = '''                logger.error(err_msg)
                recent_logs.append(err_msg)
                counters["failed"] += 1
                failed_log_fh.write(f"SKU: {sku} - Error: {exc}\\n")
                failed_log_fh.flush()'''
code = code.replace(old_fail2, new_fail2)

# Also close it at the end
old_end = '''    if batch_creates or batch_updates:
        flush_batch()'''
new_end = '''    if batch_creates or batch_updates:
        flush_batch()
    failed_log_fh.close()'''
code = code.replace(old_end, new_end)

# Add the Copy Logs button and function to GUI
old_gui = '''        self.log_text = scrolledtext.ScrolledText(frame, wrap=tk.WORD, height=18, state="disabled")
        self.log_text.grid(row=7, column=0, columnspan=3, sticky="nsew")

        root.after(100, self.drain_events)'''
new_gui = '''        self.log_text = scrolledtext.ScrolledText(frame, wrap=tk.WORD, height=18, state="disabled")
        self.log_text.grid(row=7, column=0, columnspan=3, sticky="nsew")

        self.copy_button = ttk.Button(frame, text="Copy Logs to Clipboard", command=self.copy_logs)
        self.copy_button.grid(row=8, column=0, columnspan=3, sticky="ew", pady=(8, 0))

        root.after(100, self.drain_events)

    def copy_logs(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.log_text.get("1.0", self.tk.END))
        self.root.update()'''
code = code.replace(old_gui, new_gui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied successfully")
