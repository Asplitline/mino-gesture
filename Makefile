# CERT     ?= mino-gesture-dev
# DEBUG_BIN  = src-tauri/target/debug/mino-gesture

# .PHONY: dev sign sign-watch

# # Run dev server (frontend hot-reload + Rust rebuild on change)
# dev:
# 	pnpm tauri dev

# # Re-sign the debug binary after a Rust rebuild.
# # Run this once after `pnpm tauri dev` does a Rust rebuild.
# sign:
# 	codesign -f -s "$(CERT)" $(DEBUG_BIN)
# 	@echo "✓ Signed $(DEBUG_BIN)"

# # Watch the binary for changes and auto-sign on each Rust rebuild.
# # Run in a separate terminal alongside `make dev`.
# sign-watch:
# 	@echo "Watching $(DEBUG_BIN) for changes (Ctrl-C to stop)..."
# 	@while true; do \
# 		if [ -f /tmp/.mino_last_sign ]; then \
# 			newer=$$(find $(DEBUG_BIN) -newer /tmp/.mino_last_sign -type f 2>/dev/null); \
# 		else \
# 			newer=$(DEBUG_BIN); \
# 		fi; \
# 		if [ -n "$$newer" ]; then \
# 			codesign -f -s "$(CERT)" $(DEBUG_BIN) 2>/dev/null && \
# 			echo "$$(date '+%H:%M:%S') Re-signed after rebuild"; \
# 			touch /tmp/.mino_last_sign; \
# 		fi; \
# 		sleep 1; \
# 	done
